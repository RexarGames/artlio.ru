import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const TELEGRAM_CHANNEL = Deno.env.get('TELEGRAM_CHANNEL') ?? 'DexxureEnt';
const SYNC_SECRET = Deno.env.get('SYNC_SECRET') ?? '';

function decodeHtml(value: string) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('<br/>', '\n')
    .replaceAll('<br>', '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pick(pattern: RegExp, text: string) {
  return text.match(pattern)?.[1]?.trim() ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Missing Supabase server env variables');
    if (SYNC_SECRET && req.headers.get('x-sync-secret') !== SYNC_SECRET) throw new Error('Invalid sync secret');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const response = await fetch(`https://t.me/s/${TELEGRAM_CHANNEL}`, {
      headers: { 'User-Agent': 'DexxureMultisiteBot/1.0' },
    });
    if (!response.ok) throw new Error(`Telegram page returned ${response.status}`);

    const html = await response.text();
    const rawBlocks = html.match(/<div class="tgme_widget_message_wrap[\s\S]*?(?=<div class="tgme_widget_message_wrap|<\/section>|<\/body>)/g) ?? [];

    const posts = rawBlocks.slice(-15).map((block) => {
      const messageId = pick(/data-post="[^"]+\/(\d+)"/, block) ?? pick(/https:\/\/t\.me\/[A-Za-z0-9_]+\/(\d+)/, block);
      const url = messageId ? `https://t.me/${TELEGRAM_CHANNEL}/${messageId}` : `https://t.me/${TELEGRAM_CHANNEL}`;
      const textRaw = pick(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/, block) ?? '';
      const content = decodeHtml(textRaw);
      const imageUrl = pick(/background-image:url\('([^']+)'\)/, block) ?? pick(/<img[^>]+src="([^"]+)"/, block);
      const dateRaw = pick(/<time datetime="([^"]+)"/, block);
      const views = pick(/<span class="tgme_widget_message_views">([^<]+)<\/span>/, block);
      const title = content.split('\n').find(Boolean)?.slice(0, 90) || 'Пост DexxureEnt';

      if (!messageId && !content) return null;
      return {
        telegram_message_id: messageId ?? crypto.randomUUID(),
        telegram_url: url,
        title,
        content,
        image_url: imageUrl,
        views,
        published_at: dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }).filter(Boolean);

    if (!posts.length) throw new Error('No Telegram posts parsed');

    const { error } = await supabase
      .from('telegram_posts')
      .upsert(posts, { onConflict: 'telegram_message_id' });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, count: posts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
