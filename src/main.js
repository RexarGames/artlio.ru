import { supabase, requireAuth, logout, trackEvent } from './supabase.js';

const session = await requireAuth();
if (!session) throw new Error('Auth required');

const navToggle = document.querySelector('#navToggle');
const nav = document.querySelector('.nav');
const logoutButton = document.querySelector('#logoutButton');
const userBadge = document.querySelector('#userBadge');
const pageName = location.pathname.split('/').pop() || 'home.html';

document.querySelectorAll('.nav__link').forEach((link) => {
  const href = link.getAttribute('href');
  if (href === pageName) link.classList.add('is-active');
});

navToggle?.addEventListener('click', () => {
  nav?.classList.toggle('is-open');
});

logoutButton?.addEventListener('click', async () => {
  await trackEvent('logout');
  await logout();
});

const { data: settings } = await supabase
  .from('user_settings')
  .select('*')
  .eq('user_id', session.user.id)
  .maybeSingle();

const nickname = settings?.nickname || session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || 'User';
userBadge.textContent = nickname;

if (settings?.accent_color) document.documentElement.style.setProperty('--accent', settings.accent_color);
if (settings?.scanlines === false) document.body.classList.add('no-scanlines');
if (settings?.reduced_motion === true) document.body.classList.add('reduced-motion');
if (settings?.compact_mode === true) document.body.classList.add('compact-mode');

await trackEvent('page_view', { title: document.title });
