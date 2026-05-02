import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';

function safeText(value: unknown, max = 900) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .slice(0, max);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_ADMIN_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase server env variables');
    }

    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) throw new Error('Missing auth token');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error('Invalid auth token');

    const body = await req.json().catch(() => ({}));
    const eventType = safeText(body.event_type, 80) || 'unknown_event';
    const page = safeText(body.page, 160);
    const details = typeof body.details === 'object' && body.details !== null ? body.details : {};
    const userAgent = safeText(req.headers.get('user-agent'), 500);
    const forwardedFor = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? '';
    const ipHash = forwardedFor ? await sha256(forwardedFor.split(',')[0].trim()) : null;

    const { error: insertError } = await supabase.from('site_events').insert({
      user_id: userData.user.id,
      event_type: eventType,
      page,
      details,
      ip_hash: ipHash,
      user_agent: userAgent,
    });
    if (insertError) throw insertError;

    const email = userData.user.email ?? 'no email';
    const detailsShort = JSON.stringify(details).slice(0, 700);
    await sendTelegram([
      'Dexxure Multisite event',
      `event: ${eventType}`,
      `page: ${page || 'unknown'}`,
      `user: ${email}`,
      `user_id: ${userData.user.id}`,
      `details: ${detailsShort}`,
      `time: ${new Date().toISOString()}`,
    ].join('\n'));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
