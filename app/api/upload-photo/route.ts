import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'quote-photos';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = /^image\//;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    // Either quoteId or customerId may be provided. Photos are primarily
    // property-scoped (customer_id), but legacy uploads still pass quoteId
    // from the quote editor — in that case we derive customer_id from the
    // linked quote so the photo attaches to the right household.
    const quoteIdInput = formData.get('quoteId') as string | null;
    const customerIdInput = formData.get('customerId') as string | null;
    const caption = (formData.get('caption') as string | null) ?? null;

    if (!file || (!quoteIdInput && !customerIdInput)) {
      return NextResponse.json(
        { error: 'file and (quoteId or customerId) are required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.test(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials missing');
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let customerId = customerIdInput;
    if (!customerId && quoteIdInput) {
      const { data: quoteRow } = await supabase
        .from('repair_quotes')
        .select('customer_id')
        .eq('id', quoteIdInput)
        .single();
      customerId = (quoteRow?.customer_id as string | null) ?? null;
    }

    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const pathPrefix = customerId ?? quoteIdInput ?? 'orphan';
    const storagePath = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Photo upload error:', uploadError);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const { data: row, error: insertError } = await supabase
      .from('quote_photos')
      .insert({
        quote_id: quoteIdInput,
        customer_id: customerId,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption,
      })
      .select()
      .single();

    if (insertError) {
      // Best-effort: clean up the orphaned storage object
      await supabase.storage.from(BUCKET).remove([storagePath]);
      console.error('Photo row insert error:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, photo: row });
  } catch (error) {
    console.error('Upload photo error:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: row, error: fetchErr } = await supabase
      .from('quote_photos')
      .select('storage_path')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ success: true });
    }

    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove([row.storage_path]);
    if (storageErr) {
      console.error('Storage delete error:', storageErr);
    }

    const { error: rowErr } = await supabase
      .from('quote_photos')
      .delete()
      .eq('id', id);

    if (rowErr) {
      return NextResponse.json({ error: rowErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
