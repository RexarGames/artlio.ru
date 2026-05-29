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

function cleanText(value: unknown, maxLength = 900) {
  return String(value ?? '').replace(/[<>]/g, '').slice(0, maxLength);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sendTelegramMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_CHAT_ID, text, disable_web_page_preview: true }),
  });

  if (!response.ok) console.error('Telegram send error:', await response.text());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Missing Supabase server variables');

    const authorization = req.headers.get('authorization') ?? '';
    const accessToken = authorization.replace('Bearer ', '').trim();
    if (!accessToken) throw new Error('Missing authorization token');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) throw new Error('Invalid user token');

    const body = await req.json().catch(() => ({}));
    const eventType = cleanText(body.event_type, 100) || 'unknown_event';
    const page = cleanText(body.page, 200) || 'unknown_page';
    const details = typeof body.details === 'object' && body.details !== null ? body.details : {};
    const userAgent = cleanText(req.headers.get('user-agent'), 500);
    const forwardedFor = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? '';
    const ip = forwardedFor.split(',')[0]?.trim() ?? '';
    const ipHash = ip ? await sha256(ip) : null;

    const { error: insertError } = await supabase.from('site_events').insert({
      user_id: userData.user.id,
      event_type: eventType,
      page,
      details,
      ip_hash: ipHash,
      user_agent: userAgent,
    });

    if (insertError) throw insertError;

    await sendTelegramMessage([
      'Dexxure Games site event',
      `Event: ${eventType}`,
      `Page: ${page}`,
      `User: ${userData.user.email ?? 'no-email'}`,
      `User ID: ${userData.user.id}`,
      `Details: ${JSON.stringify(details).slice(0, 700)}`,
      `Time: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
    ].join('\n'));

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
