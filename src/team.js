import { supabase, trackEvent } from './supabase.js';

const teamGrid = document.querySelector('#teamGrid');

const fallbackTeam = [
  { nickname: 'Dexxure', role: 'Владелец', bio: 'Отвечает за направление проекта, развитие команды и общую структуру Dexxure Games.' },
  { nickname: 'Link', role: 'Основной разработчик игр', bio: 'Основной разработчик игр на Unity и Unreal Engine.' },
  { nickname: 'afryder', role: 'Программист', bio: 'Пишет код, помогает с логикой систем и технической частью проектов.' },
  { nickname: 'Jiterset', role: 'Тестировщик игр', bio: 'Проверяет сборки, ищет баги и помогает доводить проекты до стабильного состояния.' },
];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderMember(member, index) {
  const number = String(index + 1).padStart(2, '0');
  return `
    <article class="member-card glass-card">
      <div class="member-card__index">${number}</div>
      <h3>${escapeHtml(member.nickname)}</h3>
      <strong>${escapeHtml(member.role)}</strong>
      <p>${escapeHtml(member.bio)}</p>
    </article>
  `;
}

async function loadTeam() {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  const members = !error && data?.length ? data : fallbackTeam;
  teamGrid.innerHTML = members.map(renderMember).join('');
}

loadTeam();
trackEvent('team_opened');
