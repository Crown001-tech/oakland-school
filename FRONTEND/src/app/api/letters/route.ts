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
    const { data: rows, error } = await sb
      .from('documents')
      .select('*')
      .eq('document_type', 'official_letter')
      .order('created_at', { ascending: false });

    if (error && error.code !== '42P01') throw error;

    const letters = (rows || []).map((row: any) => ({
      id: row.id,
      refNo: row.metadata?.refNo || 'OAK/PRIN/MEM/2026/001',
      type: row.metadata?.type || 'Meeting Notice',
      recipientName: row.metadata?.recipientName || 'Staff Member',
      recipientRole: row.metadata?.recipientRole || 'Recipient',
      recipientEmail: row.metadata?.recipientEmail || '',
      subject: row.title,
      body: row.metadata?.body || '',
      date:
        row.metadata?.date ||
        new Date(row.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      issuedBy: row.metadata?.issuedBy || 'Mr Seyi Bankole',
      signatoryRole: row.metadata?.signatoryRole || 'School Principal',
      includeSeal: row.metadata?.includeSeal ?? true,
      status: row.status === 'published' ? 'Issued' : 'Draft',
      createdAt: row.created_at,
    }));

    return NextResponse.json({ success: true, data: letters });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      refNo,
      type,
      recipientName,
      recipientRole,
      recipientEmail,
      subject,
      body: letterBody,
      date,
      issuedBy,
      signatoryRole,
      includeSeal,
      associatedStaffId,
    } = body;

    if (!refNo || !recipientName || !subject || !letterBody) {
      return NextResponse.json(
        { success: false, error: 'Reference number, recipient, subject, and body are required' },
        { status: 400 }
      );
    }

    const sb = getAdminClient();
    const cleanRef = refNo.replace(/[\/\\]/g, '_');

    const { data: doc, error } = await sb
      .from('documents')
      .insert({
        title: subject,
        document_type: 'official_letter',
        file_name: `${cleanRef}.pdf`,
        file_url: `https://gxkywfgoitfjyuipkmqj.supabase.co/storage/v1/object/public/documents/${encodeURIComponent(cleanRef)}.pdf`,
        file_size_bytes: (letterBody || '').length * 2,
        mime_type: 'application/pdf',
        tags: ['letter', 'principal', (type || 'notice').toLowerCase().replace(/\s+/g, '_')],
        status: 'published',
        associated_staff_id: associatedStaffId || null,
        metadata: {
          refNo,
          type: type || 'Official Notice',
          recipientName,
          recipientRole: recipientRole || 'Recipient',
          recipientEmail: recipientEmail || '',
          body: letterBody,
          date:
            date ||
            new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
          issuedBy: issuedBy || 'Mr Seyi Bankole',
          signatoryRole: signatoryRole || 'School Principal',
          includeSeal: includeSeal ?? true,
        },
      })
      .select()
      .single();

    if (error) throw error;

    // Log to audit trail
    try {
      await sb.from('audit_logs').insert({
        actor_role: 'Principal',
        action: 'letter.issued',
        resource_type: 'letter',
        resource_id: doc.id,
        metadata: {
          refNo,
          recipientName,
          subject,
          type,
        },
      });
    } catch {}

    const formattedLetter = {
      id: doc.id,
      refNo: doc.metadata?.refNo,
      type: doc.metadata?.type,
      recipientName: doc.metadata?.recipientName,
      recipientRole: doc.metadata?.recipientRole,
      recipientEmail: doc.metadata?.recipientEmail,
      subject: doc.title,
      body: doc.metadata?.body,
      date: doc.metadata?.date,
      issuedBy: doc.metadata?.issuedBy,
      signatoryRole: doc.metadata?.signatoryRole,
      includeSeal: doc.metadata?.includeSeal,
      status: 'Issued',
      createdAt: doc.created_at,
    };

    return NextResponse.json({ success: true, data: formattedLetter });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to save letter' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Letter ID is required' }, { status: 400 });
    }

    const sb = getAdminClient();
    const { error } = await sb.from('documents').delete().eq('id', id);

    if (error) throw error;

    try {
      await sb.from('audit_logs').insert({
        actor_role: 'Principal',
        action: 'letter.deleted',
        resource_type: 'letter',
        resource_id: id,
      });
    } catch {}

    return NextResponse.json({ success: true, message: 'Letter deleted from registry' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to delete letter' },
      { status: 500 }
    );
  }
}
