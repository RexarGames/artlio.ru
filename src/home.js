import { supabase, trackEvent } from './supabase.js';

const stats = {
  posts: document.querySelector('#statPosts'),
  mods: document.querySelector('#statMods'),
  team: document.querySelector('#statTeam'),
};

async function loadStats() {
  const [posts, mods, team] = await Promise.all([
    supabase.from('telegram_posts').select('id', { count: 'exact', head: true }),
    supabase.from('mods').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('is_visible', true),
  ]);

  stats.posts.textContent = posts.count ?? '0';
  stats.mods.textContent = mods.count ?? '0';
  stats.team.textContent = team.count ?? '4';
}

loadStats();
trackEvent('home_opened');
