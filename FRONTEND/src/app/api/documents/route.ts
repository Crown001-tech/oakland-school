import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getAdminClient();
    const { data: docs, error } = await sb
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedDocs = (docs || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      documentType: d.document_type,
      fileUrl: `/api/documents/file?id=${d.id}`,
      fileName: d.file_name,
      fileSizeBytes: d.file_size_bytes || 0,
      mimeType: d.mime_type || 'application/pdf',
      associatedStudentId: d.associated_student_id,
      associatedStaffId: d.associated_staff_id,
      status: d.status || 'published',
      version: d.version || 1,
      tags: d.tags || [],
      metadata: d.metadata || {},
      createdAt: d.created_at,
    }));

    return NextResponse.json({ success: true, data: formattedDocs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sb = getAdminClient();
    const contentType = request.headers.get('content-type') || '';

    let title = '';
    let documentType = '';
    let fileName = '';
    let fileSizeBytes = 0;
    let mimeType = 'application/pdf';
    let tags: string[] = ['institutional'];
    let metadata: Record<string, any> = {};
    let associatedStudentId: string | null = null;
    let associatedStaffId: string | null = null;
    let actorRole = 'Principal';
    let fileBuffer: Buffer | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = (formData.get('title') as string) || '';
      documentType = (formData.get('documentType') as string) || 'other';
      actorRole = (formData.get('actorRole') as string) || 'Principal';
      associatedStudentId = (formData.get('associatedStudentId') as string) || null;
      associatedStaffId = (formData.get('associatedStaffId') as string) || null;

      const rawTags = formData.get('tags') as string;
      if (rawTags) {
        try {
          tags = JSON.parse(rawTags);
        } catch {
          tags = [documentType, 'institutional'];
        }
      }

      const rawMetadata = formData.get('metadata') as string;
      if (rawMetadata) {
        try {
          metadata = JSON.parse(rawMetadata);
        } catch {}
      }

      const file = formData.get('file') as File | null;
      if (file && typeof file !== 'string') {
        fileName = file.name;
        fileSizeBytes = file.size;
        mimeType = file.type || 'application/pdf';
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      const body = await request.json();
      title = body.title || '';
      documentType = body.documentType || 'other';
      fileName = body.fileName || '';
      fileSizeBytes = body.fileSizeBytes || 0;
      mimeType = body.mimeType || 'application/pdf';
      tags = body.tags || ['institutional'];
      metadata = body.metadata || {};
      associatedStudentId = body.associatedStudentId || null;
      associatedStaffId = body.associatedStaffId || null;
      actorRole = body.actorRole || 'Principal';

      if (body.fileUrl && body.fileUrl.startsWith('data:')) {
        const parts = body.fileUrl.split(',');
        if (parts.length > 1) {
          fileBuffer = Buffer.from(parts[1], 'base64');
          fileSizeBytes = fileBuffer.length;
        }
      }
    }

    if (!title || !documentType || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Title, document category, and valid file attachment are required' },
        { status: 400 }
      );
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File content is empty or could not be read. Please re-select the file.' },
        { status: 400 }
      );
    }

    // Embed base64 backup in PostgreSQL metadata if under 4MB for instant resilience
    if (fileBuffer.length <= 4 * 1024 * 1024) {
      metadata.base64Backup = fileBuffer.toString('base64');
    }

    // 1. Insert database record into PostgreSQL 'documents' table
    const { data: doc, error: insertError } = await sb
      .from('documents')
      .insert({
        title,
        document_type: documentType,
        file_name: fileName,
        file_url: `/api/documents/file?temp=true`,
        file_size_bytes: fileSizeBytes,
        mime_type: mimeType,
        tags,
        status: 'published',
        metadata,
        associated_student_id: associatedStudentId,
        associated_staff_id: associatedStaffId,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database error saving document: ${insertError.message}`);
    }

    // 2. Upload the real binary buffer to Supabase Storage bucket 'documents'
    const storagePath = `${doc.id}/${fileName}`;
    const { error: storageError } = await sb.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (storageError) {
      console.error('Storage upload warning:', storageError.message);
      // If storage upload fails but we have base64Backup in PostgreSQL metadata, keep doc; otherwise fail
      if (!metadata.base64Backup) {
        await sb.from('documents').delete().eq('id', doc.id);
        throw new Error(`Storage error: ${storageError.message}`);
      }
    }

    // 3. Set permanent streaming URL
    const permanentFileUrl = `/api/documents/file?id=${doc.id}`;
    await sb
      .from('documents')
      .update({ file_url: permanentFileUrl })
      .eq('id', doc.id);
    doc.file_url = permanentFileUrl;

    // Log to audit trail
    try {
      await sb.from('audit_logs').insert({
        actor_role: actorRole,
        action: 'document.uploaded',
        resource_type: 'document',
        resource_id: doc.id,
        metadata: {
          title,
          documentType,
          fileName,
          fileSizeBytes,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: doc });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to save document' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
    }

    const sb = getAdminClient();
    const { error } = await sb.from('documents').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to delete document' },
      { status: 500 }
    );
  }
}
