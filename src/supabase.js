import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    const next = encodeURIComponent(location.pathname.split('/').pop() || 'home.html');
    location.href = `index.html?next=${next}`;
    return null;
  }
  return session;
}

export async function logout() {
  await supabase.auth.signOut();
  location.href = 'index.html';
}

export async function trackEvent(eventType, details = {}) {
  try {
    const session = await getSession();
    if (!session?.access_token) return;

    await fetch(`${SUPABASE_URL}/functions/v1/track-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        event_type: eventType,
        page: location.pathname.split('/').pop() || 'index.html',
        details,
      }),
    });
  } catch (error) {
    // Tracking must not break the site.
    console.warn('[trackEvent]', error);
  }
}
