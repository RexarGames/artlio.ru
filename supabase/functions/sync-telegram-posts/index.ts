import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const CHANNEL = Deno.env.get('TELEGRAM_CHANNEL') || 'DexxureEnt';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SYNC_SECRET = Deno.env.get('SYNC_SECRET') || '';

function decodeHtml(input: string) {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPosts(html: string) {
  const blocks = html.split('<div class="tgme_widget_message_wrap');
  const posts = [];

  for (const rawBlock of blocks) {
    const block = '<div class="tgme_widget_message_wrap' + rawBlock;
    const postMatch = block.match(/data-post="([^"]+)"/);
    if (!postMatch) continue;

    const externalId = postMatch[1];
    const dateMatch = block.match(/datetime="([^"]+)"/);
    const textMatch = block.match(/<div class="tgme_widget_message_text js-message_text"[^>]*>([\s\S]*?)<\/div>/);
    const viewsTextMatch = block.match(/<span class="tgme_widget_message_views">([\s\S]*?)<\/span>/);

    const text = textMatch ? decodeHtml(textMatch[1]) : '';
    const firstLine = text.split('\n').map((line) => line.trim()).filter(Boolean)[0] || 'Пост Dexxure';
    const postNumber = externalId.split('/')[1];

    posts.push({
      external_id: externalId,
      title: firstLine.slice(0, 90),
      text: text || `Пост из канала @${CHANNEL}`,
      url: `https://t.me/${CHANNEL}/${postNumber}`,
      published_at: dateMatch?.[1] || null,
      views: viewsTextMatch ? decodeHtml(viewsTextMatch[1]) : null,
    });
  }

  return posts.slice(0, 12);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (SYNC_SECRET) {
    const incomingSecret = req.headers.get('x-sync-secret') || '';
    if (incomingSecret !== SYNC_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized sync request' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const sourceUrl = `https://t.me/s/${CHANNEL}`;
  const response = await fetch(sourceUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 DexxureGamesBot/1.0',
    },
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: `Telegram page responded ${response.status}` }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const html = await response.text();
  const posts = extractPosts(html);

  if (!posts.length) {
    return new Response(JSON.stringify({ inserted: 0, warning: 'No posts parsed. Telegram markup may have changed.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from('telegram_posts')
    .upsert(posts.map(({ views, ...post }) => post), { onConflict: 'external_id' });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ inserted: posts.length, channel: CHANNEL, source: sourceUrl }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
