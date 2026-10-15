import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const isDownload = url.searchParams.get('download') === 'true';

    if (!id) {
      return new NextResponse('Document ID is required', { status: 400 });
    }

    const sb = getAdminClient();
    const { data: doc, error } = await sb
      .from('documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !doc) {
      return new NextResponse('Document not found', { status: 404 });
    }

    const fileName = doc.file_name || `${doc.title}.pdf`;
    const safeAsciiName = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
    const encodedName = encodeURIComponent(fileName);
    const mimeType = doc.mime_type || 'application/pdf';
    const disposition = isDownload ? 'attachment' : 'inline';
    const contentDisposition = `${disposition}; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`;

    // 1. Check if file is stored in Supabase Storage bucket 'documents'
    try {
      const storagePath = `${doc.id}/${doc.file_name}`;
      const { data: fileData, error: storageErr } = await sb.storage
        .from('documents')
        .download(storagePath);

      if (!storageErr && fileData) {
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': contentDisposition,
            'Content-Length': String(buffer.length),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    } catch {}

    // 2. Check if backup binary is stored in PostgreSQL metadata
    if (doc.metadata && typeof doc.metadata === 'object' && doc.metadata.base64Backup) {
      try {
        const buffer = Buffer.from(doc.metadata.base64Backup, 'base64');
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': contentDisposition,
            'Content-Length': String(buffer.length),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch {}
    }

    // 3. Check if file_url is a Base64 data URL
    if (doc.file_url && doc.file_url.startsWith('data:')) {
      const parts = doc.file_url.split(',');
      if (parts.length > 1) {
        const buffer = Buffer.from(parts[1], 'base64');
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': contentDisposition,
            'Content-Length': String(buffer.length),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    // 4. Check if file_url is an external HTTP URL
    if (doc.file_url && doc.file_url.startsWith('http')) {
      try {
        const res = await fetch(doc.file_url);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Content-Disposition': contentDisposition,
              'Content-Length': String(buffer.length),
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }
      } catch {}
    }

    // 5. Strict Zero-Mock: Never synthesize fake text files. Return 404 if file binary is missing.
    return new NextResponse('Document binary not found in storage repository', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err: any) {
    return new NextResponse(
      err instanceof Error ? err.message : 'Failed to serve document',
      { status: 500 }
    );
  }
}
