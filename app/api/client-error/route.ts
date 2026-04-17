import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const MAX_FIELD_LEN = 2000;

function truncate(value: unknown): string | null {
  if (value == null) return null;
  const s = typeof value === 'string' ? value : String(value);
  return s.length > MAX_FIELD_LEN ? s.slice(0, MAX_FIELD_LEN) : s;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const row = {
      quote_id: body.quoteId || null,
      source: truncate(body.source) || 'unknown',
      error_branch: truncate(body.errorBranch) || 'unknown',
      http_status: typeof body.httpStatus === 'number' ? body.httpStatus : null,
      user_agent: truncate(body.userAgent),
      connection_type: truncate(body.connectionType),
      save_data: typeof body.saveData === 'boolean' ? body.saveData : null,
      raw_name: truncate(body.rawName),
      raw_message: truncate(body.rawMessage),
      request_id: truncate(body.requestId),
    };

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('client_errors').insert(row);

    if (error) {
      console.log(JSON.stringify({ at: 'client-error', event: 'insert_failed', message: error.message }));
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.log(JSON.stringify({ at: 'client-error', event: 'handler_error', message }));
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
