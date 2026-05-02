const feedEl = document.getElementById('feed');
const statusEl = document.getElementById('status');
const termsEl = document.getElementById('terms');
const refreshBtn = document.getElementById('refresh');
const filters = document.getElementById('filters');

let state = {
  items: [],
  sources: {},
  platform: 'all',
};

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - Date.parse(iso)) / 1000;
  if (Number.isNaN(diff)) return '';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function renderPost(p) {
  const avatar = p.author?.avatar
    ? `<img class="avatar" src="${escapeHtml(p.author.avatar)}" alt="" />`
    : `<div class="avatar"></div>`;
  const media = p.mediaUrl
    ? `<img class="media" src="${escapeHtml(p.mediaUrl)}" alt="" loading="lazy" />`
    : '';
  const m = p.metrics || {};
  const metrics = [
    m.likes != null ? `♥ ${m.likes}` : null,
    m.reposts != null ? `↻ ${m.reposts}` : null,
    m.replies != null ? `💬 ${m.replies}` : null,
  ].filter(Boolean).map((s) => `<span>${s}</span>`).join('');

  return `
    <article class="post" data-platform="${p.platform}">
      <header>
        ${avatar}
        <div class="who">
          <span class="name">${escapeHtml(p.author?.name || '')}</span>
          <span class="handle">${escapeHtml(p.author?.handle || '')}</span>
        </div>
        <span class="badge ${p.platform}">${p.platform}</span>
      </header>
      <div class="text">${escapeHtml(p.text)}</div>
      ${media}
      <footer>
        <div class="metrics">${metrics}</div>
        <div>
          <span title="${escapeHtml(p.createdAt || '')}">${relativeTime(p.createdAt)}</span>
          ${p.url ? ` &middot; <a class="permalink" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">View</a>` : ''}
        </div>
      </footer>
    </article>
  `;
}

function render() {
  const filtered = state.platform === 'all'
    ? state.items
    : state.items.filter((p) => p.platform === state.platform);

  if (!filtered.length) {
    feedEl.innerHTML = `<div class="empty">No mentions found yet.</div>`;
    return;
  }
  feedEl.innerHTML = filtered.map(renderPost).join('');
}

function renderStatus(payload) {
  termsEl.textContent = payload.terms?.length
    ? `Tracking: ${payload.terms.join(', ')}`
    : 'No search terms configured (set SEARCH_TERMS in .env)';

  const parts = Object.entries(payload.sources || {}).map(([name, info]) => {
    if (!info.configured) return `<span class="src">${name}: not configured</span>`;
    if (info.error) return `<span class="src err">${name}: ${escapeHtml(info.error)}</span>`;
    return `<span class="src">${name}: ${info.count}</span>`;
  });
  const cached = payload.cached ? ' (cached)' : '';
  statusEl.innerHTML = `${parts.join('')}<span class="src">updated ${relativeTime(payload.fetchedAt)}${cached}</span>`;
}

async function load(refresh = false) {
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Loading…';
  try {
    const res = await fetch(`/api/feed${refresh ? '?refresh=1' : ''}`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Request failed');
    state.items = payload.items || [];
    state.sources = payload.sources || {};
    renderStatus(payload);
    render();
  } catch (err) {
    statusEl.innerHTML = `<span class="src err">${escapeHtml(err.message)}</span>`;
    feedEl.innerHTML = '';
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh';
  }
}

filters.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-platform]');
  if (!btn) return;
  filters.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  state.platform = btn.dataset.platform;
  render();
});

refreshBtn.addEventListener('click', () => load(true));

load();
