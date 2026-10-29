import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown, Copy, ExternalLink, Film, Heart, Image, Infinity as InfinityIcon, LoaderCircle, Search, Sparkles, Sticker, TrendingUp, X } from 'lucide-react';
import './styles.css';

type Media = {
  id: string;
  title: string;
  url: string;
  username: string;
  user?: { display_name: string; avatar_url: string; is_verified?: boolean };
  images: Record<string, { url: string; width: string; height: string }>;
};
type Kind = 'gifs' | 'stickers' | 'images';
type ApiResult = { data: Media[]; pagination: { offset: number; count: number; total_count: number }; error?: string };
const apiBaseUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/^VITE_API_URL=/i, '').replace(/\/$/, '');
const suggestions = ['Happy dance', 'Mind blown', 'Good vibes', 'Cats being cats', 'You got this', 'Weekend mood'];
const categories = [
  { title: 'The reaction says it all.', label: 'REACTIONS', query: 'reactions', color: 'pink', icon: '✳', text: 'Every feeling. One GIF.' },
  { title: 'A little weird. Very you.', label: 'INTERNET CULTURE', query: 'funny memes', color: 'green', icon: '☺', text: 'Fresh from your feed.' },
  { title: 'Send some good energy.', label: 'GOOD VIBES', query: 'good vibes', color: 'purple', icon: '✧', text: 'Make their day, on loop.' },
];

function apiConfigurationError() {
  if (!apiBaseUrl) return 'Search is not configured. Set VITE_API_URL to the URL of your deployed Node API service.';
  try {
    const url = new URL(apiBaseUrl);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) {
      return 'VITE_API_URL must be the HTTPS origin of your API service only, with no path or query string.';
    }
    if (['giphy.com', 'www.giphy.com', 'api.giphy.com'].includes(url.hostname)) {
      return 'VITE_API_URL must point to your deployed Node API proxy, not the GIPHY website or API. Deploy the proxy and use its service URL.';
    }
  } catch {
    return 'VITE_API_URL must be a valid HTTPS URL for your deployed Node API service.';
  }
  return '';
}

async function parseApiResult(response: Response): Promise<ApiResult> {
  const body = await response.text();
  try {
    return JSON.parse(body) as ApiResult;
  } catch {
    if (body.trimStart().startsWith('<')) {
      throw new Error('The configured API URL returned an HTML page instead of JSON. Set VITE_API_URL to your deployed Node API service origin, not a website URL.');
    }
    throw new Error('The API returned an invalid response. Check that VITE_API_URL points to your running Node API service.');
  }
}

function readFavorites(): Media[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('loop-favorites') || '[]');
    if (!Array.isArray(saved) || !saved.every(item => item && typeof item.id === 'string' && typeof item.title === 'string' && item.images?.fixed_width?.url)) {
      throw new Error('Invalid saved favorites');
    }
    return saved;
  } catch (error) {
    console.error('Could not read favorites:', error);
    return [];
  }
}

function App() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<Kind>('gifs');
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [favorites, setFavorites] = useState<Media[]>(readFavorites);
  const [savedView, setSavedView] = useState(false);
  const [selected, setSelected] = useState<Media | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');
  const [toast, setToast] = useState('');
  const [retry, setRetry] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const accountDialogRef = useRef<HTMLDialogElement>(null);
  const previousAccountFocus = useRef<HTMLElement | null>(null);
  const pageAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const configurationError = apiConfigurationError();
    if (configurationError) {
      setLoading(false);
      setError(configurationError);
      setItems([]);
      return;
    }
    pageAbort.current?.abort();
    const controller = new AbortController();
    setLoading(true);
    setLoadingMore(false);
    setError('');
    setItems([]);
    setHasMore(false);
    const params = new URLSearchParams({ q: search, type: kind === 'stickers' ? 'stickers' : 'gifs' });
    fetch(`${apiBaseUrl}/api/giphy?${params}`, { signal: controller.signal })
      .then(async response => {
        const result = await parseApiResult(response);
        if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
        return result;
      })
      .then(result => {
        setItems(result.data);
        setOffset(result.pagination.offset + result.pagination.count);
        setHasMore(result.pagination.count > 0 && result.pagination.offset + result.pagination.count < Math.min(result.pagination.total_count, 4999));
      })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); pageAbort.current?.abort(); };
  }, [search, kind, retry]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (selected) {
      previousFocus.current = document.activeElement as HTMLElement;
      dialogRef.current?.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialogRef.current?.close();
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [selected]);

  useEffect(() => {
    if (accountOpen) {
      previousAccountFocus.current = document.activeElement as HTMLElement;
      accountDialogRef.current?.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      accountDialogRef.current?.close();
      document.body.style.overflow = '';
      previousAccountFocus.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [accountOpen]);

  function submitAccountForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (formData.get('password') !== formData.get('confirm-password')) {
      setAccountMessage('Those passwords don’t match. Please check and try again.');
      return;
    }
    setAccountMessage('This form is a preview. Account creation is not connected yet, and nothing was sent or saved.');
  }

  function runSearch(value: string) {
    setQuery(value);
    setSearch(value.trim());
    setSavedView(false);
    if (value.trim() === search) setRetry(value => value + 1);
  }

  function toggleFavorite(item: Media) {
    const exists = favorites.some(favorite => favorite.id === item.id);
    const next = exists ? favorites.filter(favorite => favorite.id !== item.id) : [...favorites, item];
    try {
      localStorage.setItem('loop-favorites', JSON.stringify(next));
      setFavorites(next);
      setToast(exists ? 'Removed from your favorites' : 'A good one. Saved to favorites!');
    } catch (error) {
      console.error('Could not save favorite:', error);
      setToast('Your browser could not save this favorite. Storage may be full.');
    }
  }

  async function loadMore() {
    if (loadingMore) return;
    const configurationError = apiConfigurationError();
    if (configurationError) {
      setError(configurationError);
      return;
    }
    const controller = new AbortController();
    pageAbort.current = controller;
    setLoadingMore(true);
    setError('');
    try {
      const params = new URLSearchParams({ q: search, type: kind === 'stickers' ? 'stickers' : 'gifs', offset: String(offset) });
      const response = await fetch(`${apiBaseUrl}/api/giphy?${params}`, { signal: controller.signal });
      const result = await parseApiResult(response);
      if (!response.ok) throw new Error(result.error || 'Could not load more results.');
      setItems(previous => [...previous, ...result.data.filter(item => !previous.some(existing => existing.id === item.id))]);
      setOffset(result.pagination.offset + result.pagination.count);
      setHasMore(result.pagination.count > 0 && result.pagination.offset + result.pagination.count < Math.min(result.pagination.total_count, 4999));
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load more results.');
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }

  async function copyLink(item: Media) {
    try {
      await navigator.clipboard.writeText(mediaUrl(item, true));
      setToast('Link copied. Spread the feeling.');
    } catch (error) {
      console.error('Could not copy link:', error);
      setToast('Could not copy the link. Open it on GIPHY to share.');
    }
  }

  function mediaUrl(item: Media, full = false) {
    return (kind === 'images' ? item.images.original_still?.url : full ? item.images.original?.url : item.images.fixed_width?.url) || item.images.fixed_width.url;
  }

  const visible = savedView ? favorites : items;
  return (
    <div className="app">
      <header className="header">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Loop home"><span className="brand-icon"><InfinityIcon size={28} strokeWidth={2.8} /></span>loop<span className="brand-dot">.</span></a>
        <nav className="top-nav" aria-label="Main navigation">
          <button className={!savedView ? 'nav-active' : ''} onClick={() => { setSavedView(false); runSearch(''); }}>Explore</button>
          <button className={savedView ? 'nav-active' : ''} onClick={() => setSavedView(true)}>Favorites {favorites.length > 0 && <span className="favorite-count">{favorites.length}</span>}</button>
        </nav>
        <div className="header-right"><span className="powered">POWERED BY <b>GIPHY</b><span className="giphy-mark" /></span><span className="header-divider" /><button className="saved-button" onClick={() => setSavedView(true)}><Heart size={16} /> Your collection</button><button className="avatar" aria-label="Create an account" onClick={() => { setAccountMessage(''); setAccountOpen(true); }}>Y<span /></button></div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-eyebrow"><span /> LITTLE LOOPS. BIG FEELINGS.</div>
          <h1>For everything you <span>can’t put into words<span className="title-spark">✳</span></span></h1>
          <p>Find the perfect GIF. Share the feeling. Keep it on loop.</p>
          <form className="search-bar" onSubmit={event => { event.preventDefault(); runSearch(query); }}>
            <Search size={22} />
            <input ref={inputRef} aria-label="Search GIPHY" placeholder="Search GIFs, reactions, and all the good stuff…" value={query} onChange={event => setQuery(event.target.value)} />
            {query && <button className="clear-search" type="button" aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus(); }}><X size={17} /></button>}
            <button type="submit" className="search-submit"><span>Find a GIF</span><ArrowRight size={19} /></button>
          </form>
          <div className="suggestions"><span>Try a little</span>{suggestions.map(value => <button key={value} onClick={() => runSearch(value)}>{value} <span>↗</span></button>)}</div>
          <span className="hero-orbit orbit-one" /><span className="hero-orbit orbit-two" />
        </section>
        {!savedView && !search && <section className="category-grid" aria-label="Explore a mood">
          {categories.map(category => <button className={`category-card ${category.color}`} key={category.query} onClick={() => runSearch(category.query)}>
            <div className="category-copy"><span className="category-label">{category.label}</span><h2>{category.title}</h2><p>{category.text}</p></div><span className="category-art" aria-hidden="true">{category.icon}</span><span className="category-arrow"><ArrowRight size={17} /></span>
          </button>)}
        </section>}
        <section className="results-section">
          <div className="results-heading">
            <div><h2>{savedView ? <Heart size={23} /> : search ? <Search size={23} /> : <TrendingUp size={23} />}{savedView ? 'Your little collection' : search ? `Results for “${search}”` : 'Trending right now'}{!savedView && !search && <span className="live-tag"><span /> LIVE</span>}</h2><p>{savedView ? 'All your favorites, in one happy place.' : search ? 'A whole mood, just a search away.' : 'The internet’s current state of mind.'}</p></div>
            <div className="result-controls"><div className="tabs" role="tablist" aria-label="Media type">
              {([{ id: 'gifs', label: 'GIFs', icon: Film }, { id: 'stickers', label: 'Stickers', icon: Sticker }, { id: 'images', label: 'Images', icon: Image }] as const).map(tab => <button key={tab.id} role="tab" aria-selected={kind === tab.id} className={kind === tab.id ? 'active' : ''} onClick={() => setKind(tab.id)}><tab.icon size={15} />{tab.label}</button>)}
            </div><span className="content-rating">PG-13 <ChevronDown size={12} /></span></div>
          </div>
          {kind === 'images' && <p className="image-note"><Image size={14} /> Still frames from GIPHY GIFs. A moment worth keeping.</p>}
          {!savedView && error && <div className="error-state" role="alert"><div><strong>That didn’t quite loop.</strong><p>{error}</p></div><button onClick={() => items.length ? void loadMore() : setRetry(value => value + 1)}>Try again <ArrowRight size={16} /></button></div>}
          {!savedView && loading ? <div className="skeleton-grid" aria-label="Loading GIFs" aria-busy="true">{Array.from({ length: 12 }, (_, i) => <div key={i} style={{ height: `${[238, 185, 272, 210, 250, 190][i % 6]}px` }} />)}</div> : visible.length > 0 ? <div className={`masonry ${kind === 'stickers' ? 'sticker-grid' : ''}`}>
            {visible.map((item, index) => {
              const isFavorite = favorites.some(favorite => favorite.id === item.id);
              const image = item.images.fixed_width;
              return <article className="gif-card" key={item.id} style={{ '--card-color': ['#504767', '#3c6159', '#5b3b48', '#585332', '#333d5d'][index % 5] } as React.CSSProperties}>
                <button className="gif-open" onClick={() => setSelected(item)} aria-label={`Preview ${item.title || 'GIF'}`}>
                  <img src={mediaUrl(item)} alt={item.title || 'GIF from GIPHY'} width={Number(image.width)} height={Number(image.height)} loading={index < 6 ? 'eager' : 'lazy'} onError={event => { event.currentTarget.style.opacity = '0'; event.currentTarget.parentElement?.classList.add('unavailable'); }} />
                  <span className="card-overlay"><span>{item.user?.display_name || item.username || 'GIPHY'}{item.user?.is_verified && <Check size={12} />}</span><span className="card-title">{item.title || 'A little moment'}</span></span>
                </button>
                <button className={`heart-button ${isFavorite ? 'is-saved' : ''}`} aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'} onClick={() => toggleFavorite(item)}><Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} /></button>
                <span className="gif-badge">{kind === 'images' ? 'IMG' : kind === 'stickers' ? 'STICKER' : 'GIF'}</span>
              </article>;
            })}
          </div> : (savedView || !error) && <div className="empty-state"><span>{savedView ? <Heart size={32} /> : <Search size={32} />}</span><h3>{savedView ? 'Keep the ones that make you feel.' : 'No loops found. Yet.'}</h3><p>{savedView ? 'Tap the heart on any GIF to save it here.' : 'Try a different word or a broader search. Your perfect reaction is out there.'}</p><button onClick={() => runSearch('')}>{savedView ? 'Explore trending GIFs' : 'Back to trending'} <ArrowRight size={16} /></button></div>}
          {!savedView && !loading && hasMore && <div className="load-more"><button onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? <LoaderCircle className="spin" size={17} /> : <ArrowDown size={16} />}{loadingMore ? 'Finding more good stuff…' : 'There’s more where that came from'}</button><span>A little scroll. A lot of possibilities.</span></div>}
          {savedView && visible.length > 0 && <button className="back-explore" onClick={() => setSavedView(false)}><ArrowLeft size={16} /> Back to exploring</button>}
        </section>
      </main>
      <footer><a className="brand footer-brand" href={import.meta.env.BASE_URL}><InfinityIcon size={25} />loop.</a><span>Less typing. More feeling.</span><span className="footer-credit">Made for the way you feel. <span>✳</span> Powered by <b>GIPHY</b></span></footer>
      <dialog ref={accountDialogRef} className="preview-modal account-modal" aria-labelledby="account-title" onCancel={() => setAccountOpen(false)} onClick={event => { if (event.target === event.currentTarget) setAccountOpen(false); }}>
        <div className="modal-heading"><span><Sparkles size={16} /> A little more you</span><button aria-label="Close account form" onClick={() => setAccountOpen(false)}><X size={21} /></button></div>
        <div className="account-content">
          <h2 id="account-title">Create your account</h2>
          <p className="account-intro">Save the moments you love and keep your favorites close.</p>
          <p className="account-notice">Preview only: account creation isn’t connected. Don’t use a real password; nothing is sent or saved.</p>
          <form className="account-form" onSubmit={submitAccountForm}>
            <label htmlFor="account-name">Your name</label><input id="account-name" name="name" type="text" autoComplete="name" maxLength={80} required />
            <label htmlFor="account-email">Email address</label><input id="account-email" name="email" type="email" autoComplete="email" required />
            <label htmlFor="account-password">Password</label><input id="account-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            <label htmlFor="account-confirm-password">Confirm password</label><input id="account-confirm-password" name="confirm-password" type="password" autoComplete="new-password" minLength={8} required />
            <button type="submit" className="account-submit">Create account <ArrowRight size={17} /></button>
            {accountMessage && <p className="account-message" role="status">{accountMessage}</p>}
          </form>
        </div>
      </dialog>
      <dialog ref={dialogRef} className="preview-modal" onCancel={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) setSelected(null); }}>
        {selected && <><div className="modal-heading"><span><Sparkles size={16} /> A moment, on loop</span><button aria-label="Close preview" onClick={() => setSelected(null)}><X size={21} /></button></div><div className={`preview-image ${kind === 'stickers' ? 'transparent-preview' : ''}`}><img src={mediaUrl(selected, true)} alt={selected.title || 'GIF preview'} /></div><div className="modal-info"><h2>{selected.title || 'Your next perfect reaction'}</h2><p>by {selected.user?.display_name || selected.username || 'GIPHY'}</p><div className="modal-actions"><button onClick={() => toggleFavorite(selected)}><Heart size={17} fill={favorites.some(item => item.id === selected.id) ? 'currentColor' : 'none'} />{favorites.some(item => item.id === selected.id) ? 'Saved' : 'Save favorite'}</button><button onClick={() => void copyLink(selected)}><Copy size={17} /> Copy link</button><a href={selected.url} target="_blank" rel="noreferrer">GIPHY <ExternalLink size={15} /></a></div></div></>}
      </dialog>
      {toast && <div className="toast" role="status"><Check size={17} />{toast}<button aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
