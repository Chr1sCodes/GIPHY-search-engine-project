import './styles.css';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const suggestions = ['Happy dance', 'Mind blown', 'Good vibes', 'Cats being cats', 'You got this', 'Weekend mood'];
const $ = selector => document.querySelector(selector);
const state = { query: '', kind: 'gifs', items: [], offset: 0, hasMore: false, loading: false, loadingMore: false, error: '', favorites: readFavorites(), savedView: false, controller: null, toastTimer: null };
const input = $('#search-input');
const mediaGrid = $('.masonry');
$('.skeleton-grid').innerHTML = Array.from({ length: 12 }, (_, index) => `<div style="height:${[238, 185, 272, 210, 250, 190][index % 6]}px"></div>`).join('');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem('loop-favorites') || '[]');
    return Array.isArray(saved) && saved.every(item => item && typeof item.id === 'string' && item.images?.fixed_width?.url) ? saved : [];
  } catch {
    return [];
  }
}

function showToast(message) {
  const toast = $('.toast');
  toast.textContent = `✓ ${message}  ×`;
  toast.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function setView(savedView) {
  state.savedView = savedView;
  if (!savedView) {
    state.query = '';
    input.value = '';
    $('.clear-search').hidden = true;
  }
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('nav-active', button.dataset.view === (savedView ? 'favorites' : 'explore')));
  render();
  if (!savedView && !state.query) loadResults();
}

function setSearch(value) {
  state.query = value.trim();
  input.value = value;
  $('.clear-search').hidden = !value;
  state.savedView = false;
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('nav-active', button.dataset.view === 'explore'));
  loadResults();
}

function render() {
  const visible = state.savedView ? state.favorites : state.items;
  const isTrending = !state.savedView && !state.query;
  $('#results-title').textContent = state.savedView ? 'Your little collection' : state.query ? `Results for “${state.query}”` : 'Trending right now';
  $('#results-description').textContent = state.savedView ? 'All your favorites, in one happy place.' : state.query ? 'A whole mood, just a search away.' : 'The internet’s current state of mind.';
  $('.results-icon').textContent = state.savedView ? '♥' : state.query ? '⌕' : '↗';
  $('.live-tag').hidden = !isTrending;
  $('.category-grid').hidden = state.savedView || Boolean(state.query);
  $('.image-note').hidden = state.kind !== 'images';
  $('.favorite-count').textContent = state.favorites.length;
  $('.favorite-count').hidden = !state.favorites.length;
  document.querySelectorAll('[data-kind]').forEach(button => {
    const active = button.dataset.kind === state.kind;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  const skeleton = $('.skeleton-grid');
  const error = $('.error-state');
  const empty = $('.empty-state');
  const hasContent = visible.length > 0;
  skeleton.hidden = !state.loading;
  skeleton.setAttribute('aria-busy', String(state.loading));
  mediaGrid.hidden = state.loading || !hasContent;
  empty.hidden = state.loading || hasContent || Boolean(state.error);
  error.hidden = !state.error || state.savedView;
  error.innerHTML = state.error ? `<div><strong>That didn’t quite loop.</strong><p>${escapeHtml(state.error)}</p></div><button type="button" data-retry>Try again →</button>` : '';
  if (!hasContent) {
    empty.innerHTML = `<span>${state.savedView ? '♥' : '⌕'}</span><h3>${state.savedView ? 'Keep the ones that make you feel.' : 'No loops found. Yet.'}</h3><p>${state.savedView ? 'Tap the heart on any GIF to save it here.' : 'Try a different word or a broader search. Your perfect reaction is out there.'}</p><button type="button" data-explore>${state.savedView ? 'Explore trending GIFs' : 'Back to trending'} →</button>`;
  }
  $('.load-more').hidden = state.savedView || state.loading || !state.hasMore;
  const loadMoreButton = $('.load-more button');
  loadMoreButton.disabled = state.loadingMore;
  loadMoreButton.textContent = state.loadingMore ? 'Finding more good stuff…' : '↓ There’s more where that came from';
  $('.back-explore').hidden = !state.savedView || !hasContent;
  mediaGrid.classList.toggle('sticker-grid', state.kind === 'stickers');
  mediaGrid.innerHTML = visible.map((item, index) => {
    const image = item.images?.fixed_width || item.images?.preview_gif || {};
    const url = state.kind === 'images' ? item.images?.original_still?.url || image.url : image.url;
    const title = item.title || 'A little moment';
    const favorite = state.favorites.some(entry => entry.id === item.id);
    const author = item.user?.display_name || item.username || 'GIPHY';
    const colors = ['#504767', '#3c6159', '#5b3b48', '#585332', '#333d5d'];
    return `<article class="gif-card" data-id="${escapeHtml(item.id)}" style="--card-color:${colors[index % colors.length]}">
      <button class="gif-open" type="button" data-action="preview" aria-label="Preview ${escapeHtml(title)}"><img src="${escapeHtml(url || '')}" alt="${escapeHtml(title)}" width="${Number(image.width) || 300}" height="${Number(image.height) || 200}" loading="${index < 6 ? 'eager' : 'lazy'}"><span class="card-overlay"><span>${escapeHtml(author)}${item.user?.is_verified ? ' ✓' : ''}</span><span class="card-title">${escapeHtml(title)}</span></span></button>
      <button class="heart-button ${favorite ? 'is-saved' : ''}" type="button" data-action="favorite" aria-label="${favorite ? 'Remove from favorites' : 'Save to favorites'}">♥</button><span class="gif-badge">${state.kind === 'images' ? 'IMG' : state.kind === 'stickers' ? 'STICKER' : 'GIF'}</span>
    </article>`;
  }).join('');
}

async function loadResults(loadMore = false) {
  if (state.savedView) return render();
  if (import.meta.env.PROD && !apiBase) {
    state.loading = false;
    state.error = 'Search is not connected yet. Configure the VITE_API_URL GitHub Actions variable to enable GIF search.';
    render();
    return;
  }
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  state.loading = !loadMore;
  state.loadingMore = loadMore;
  state.error = '';
  if (!loadMore) {
    state.items = [];
    state.offset = 0;
    state.hasMore = false;
  }
  render();
  const params = new URLSearchParams({ q: state.query, type: state.kind === 'stickers' ? 'stickers' : 'gifs' });
  if (loadMore) params.set('offset', String(state.offset));
  try {
    const response = await fetch(`${apiBase}/api/giphy?${params}`, { signal: controller.signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
    if (controller.signal.aborted) return;
    state.items = loadMore ? [...state.items, ...result.data.filter(item => !state.items.some(old => old.id === item.id))] : result.data;
    state.offset = result.pagination.offset + result.pagination.count;
    state.hasMore = result.pagination.count > 0 && state.offset < Math.min(result.pagination.total_count, 4999);
  } catch (error) {
    if (!controller.signal.aborted) {
      state.error = error instanceof Error ? error.message : 'Unable to load results.';
      if (loadMore) state.loadingMore = false;
    }
  } finally {
    if (!controller.signal.aborted) {
      state.loading = false;
      state.loadingMore = false;
      render();
    }
  }
}

function updateFavorites(item) {
  const exists = state.favorites.some(favorite => favorite.id === item.id);
  state.favorites = exists ? state.favorites.filter(favorite => favorite.id !== item.id) : [...state.favorites, item];
  try {
    localStorage.setItem('loop-favorites', JSON.stringify(state.favorites));
    showToast(exists ? 'Removed from your favorites' : 'A good one. Saved to favorites!');
  } catch {
    showToast('Your browser could not save this favorite.');
  }
  render();
}

function openPreview(item) {
  const image = state.kind === 'images' ? item.images?.original_still?.url : item.images?.original?.url;
  const title = item.title || 'Your next perfect reaction';
  const modal = $('#preview-modal');
  modal.innerHTML = `<div class="modal-heading"><span>✧ A moment, on loop</span><button type="button" aria-label="Close preview">×</button></div><div class="preview-image ${state.kind === 'stickers' ? 'transparent-preview' : ''}"><img src="${escapeHtml(image || item.images?.fixed_width?.url || '')}" alt="${escapeHtml(title)}"></div><div class="modal-info"><h2 id="preview-title">${escapeHtml(title)}</h2><p>by ${escapeHtml(item.user?.display_name || item.username || 'GIPHY')}</p><div class="modal-actions"><button type="button" data-preview-favorite>${state.favorites.some(entry => entry.id === item.id) ? '♥ Saved' : '♥ Save favorite'}</button><button type="button" data-copy>Copy link</button><a href="${escapeHtml(item.url || 'https://giphy.com')}" target="_blank" rel="noreferrer">GIPHY ↗</a></div></div>`;
  modal.querySelector('[aria-label="Close preview"]').addEventListener('click', () => modal.close());
  modal.querySelector('[data-preview-favorite]').addEventListener('click', () => updateFavorites(item));
  modal.querySelector('[data-copy]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(image || item.url); showToast('Link copied. Spread the feeling.'); }
    catch { showToast('Could not copy the link. Open it on GIPHY to share.'); }
  });
  modal.addEventListener('click', event => { if (event.target === modal) modal.close(); }, { once: true });
  modal.showModal();
}

$('.suggestions').insertAdjacentHTML('beforeend', suggestions.map(value => `<button type="button" data-query="${escapeHtml(value)}">${escapeHtml(value)} <span>↗</span></button>`).join(''));
$('#search-form').addEventListener('submit', event => { event.preventDefault(); setSearch(input.value); });
input.addEventListener('input', () => { $('.clear-search').hidden = !input.value; });
$('.clear-search').addEventListener('click', () => { input.value = ''; input.focus(); $('.clear-search').hidden = true; });
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view === 'favorites')));
document.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => setSearch(button.dataset.query)));
document.querySelectorAll('[data-kind]').forEach(button => button.addEventListener('click', () => {
  if (state.kind === button.dataset.kind) return;
  state.kind = button.dataset.kind;
  loadResults();
}));
$('.load-more button').addEventListener('click', () => loadResults(true));
$('.back-explore').addEventListener('click', () => setView(false));
$('.error-state').addEventListener('click', event => { if (event.target.closest('[data-retry]')) loadResults(); });
$('.empty-state').addEventListener('click', event => { if (event.target.closest('[data-explore]')) { input.value = ''; setSearch(''); } });
mediaGrid.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  const card = button?.closest('[data-id]');
  const item = card && (state.savedView ? state.favorites : state.items).find(entry => entry.id === card.dataset.id);
  if (!item) return;
  if (button.dataset.action === 'favorite') updateFavorites(item);
  if (button.dataset.action === 'preview') openPreview(item);
});
mediaGrid.addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement) {
    event.target.style.opacity = '0';
    event.target.parentElement?.classList.add('unavailable');
  }
}, true);
$('.avatar').addEventListener('click', () => $('#account-modal').showModal());
$('#account-modal').querySelector('.modal-heading button').addEventListener('click', () => $('#account-modal').close());
$('#account-modal').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
$('.account-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = $('.account-message');
  if (form.elements.password.value !== form.elements['confirm-password'].value) {
    message.textContent = 'Those passwords don’t match. Please check and try again.';
  } else {
    message.textContent = 'This form is a preview. Account creation is not connected yet, and nothing was sent or saved.';
  }
  message.hidden = false;
});

render();
loadResults();