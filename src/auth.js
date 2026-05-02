import { supabase, getSession, trackEvent } from './supabase.js';

const loginForm = document.querySelector('#loginForm');
const registerForm = document.querySelector('#registerForm');
const tabLogin = document.querySelector('[data-auth-tab="login"]');
const tabRegister = document.querySelector('[data-auth-tab="register"]');
const authMessage = document.querySelector('#authMessage');
const nextPage = new URLSearchParams(location.search).get('next') || 'home.html';

function setMessage(text, type = 'info') {
  authMessage.textContent = text;
  authMessage.dataset.type = type;
}

function setMode(mode) {
  const isLogin = mode === 'login';
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  tabLogin.classList.toggle('is-active', isLogin);
  tabRegister.classList.toggle('is-active', !isLogin);
  setMessage(isLogin ? 'Войди, чтобы открыть Dexxure Multisite.' : 'Создай аккаунт, чтобы сохранять настройки и загружать моды.');
}

tabLogin.addEventListener('click', () => setMode('login'));
tabRegister.addEventListener('click', () => setMode('register'));

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(loginForm);
  const email = String(form.get('email')).trim();
  const password = String(form.get('password'));

  setMessage('Проверяю данные...');
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setMessage(error.message || 'Не удалось войти.', 'error');
    return;
  }

  await trackEvent('login', { method: 'password' });
  location.href = nextPage;
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(registerForm);
  const email = String(form.get('email')).trim();
  const password = String(form.get('password'));
  const nickname = String(form.get('nickname')).trim() || email.split('@')[0];

  if (password.length < 6) {
    setMessage('Пароль должен быть минимум 6 символов.', 'error');
    return;
  }

  setMessage('Создаю аккаунт...');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
    },
  });

  if (error) {
    setMessage(error.message || 'Не удалось зарегистрироваться.', 'error');
    return;
  }

  // If email confirmation is disabled, session will be available immediately.
  if (data.session) {
    await supabase.from('user_settings').upsert({
      user_id: data.user.id,
      nickname,
    });
    await trackEvent('register', { method: 'password' });
    location.href = 'home.html';
  } else {
    setMessage('Аккаунт создан. Проверь почту и подтверди регистрацию.', 'success');
  }
});

getSession().then((session) => {
  if (session) location.href = nextPage;
});
