import { supabase, getSession, trackEvent } from './supabase.js';

const settingsForm = document.querySelector('#settingsForm');
const settingsMessage = document.querySelector('#settingsMessage');
const accentPreview = document.querySelector('#accentPreview');

function setMessage(text, type = 'info') {
  settingsMessage.textContent = text;
  settingsMessage.dataset.type = type;
}

const session = await getSession();
const { data: settings } = await supabase
  .from('user_settings')
  .select('*')
  .eq('user_id', session.user.id)
  .maybeSingle();

settingsForm.nickname.value = settings?.nickname || session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || '';
settingsForm.accent_color.value = settings?.accent_color || '#b7ff00';
settingsForm.scanlines.checked = settings?.scanlines ?? true;
settingsForm.reduced_motion.checked = settings?.reduced_motion ?? false;
settingsForm.compact_mode.checked = settings?.compact_mode ?? false;
accentPreview.style.background = settingsForm.accent_color.value;

settingsForm.accent_color.addEventListener('input', () => {
  accentPreview.style.background = settingsForm.accent_color.value;
  document.documentElement.style.setProperty('--accent', settingsForm.accent_color.value);
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    user_id: session.user.id,
    nickname: settingsForm.nickname.value.trim() || 'Dexxure User',
    accent_color: settingsForm.accent_color.value,
    scanlines: settingsForm.scanlines.checked,
    reduced_motion: settingsForm.reduced_motion.checked,
    compact_mode: settingsForm.compact_mode.checked,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('user_settings').upsert(payload);
  if (error) {
    setMessage(error.message || 'Не удалось сохранить настройки.', 'error');
    return;
  }

  setMessage('Настройки сохранены.', 'success');
  await trackEvent('settings_saved', {
    nickname: payload.nickname,
    accent_color: payload.accent_color,
    scanlines: payload.scanlines,
    reduced_motion: payload.reduced_motion,
    compact_mode: payload.compact_mode,
  });
});

trackEvent('settings_opened');
