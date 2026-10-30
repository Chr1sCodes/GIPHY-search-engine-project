export function buildGiphyUrl({ apiKey, query = '', type = 'gifs', offset: requestedOffset = 0 }) {
  const mediaType = type === 'stickers' ? 'stickers' : 'gifs';
  const search = query.trim().slice(0, 50);
  const rawOffset = Number(requestedOffset);
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 4999) : 0;
  const url = new URL(`https://api.giphy.com/v1/${mediaType}/${search ? 'search' : 'trending'}`);
  url.search = new URLSearchParams({
    api_key: apiKey,
    limit: '24',
    offset: String(offset),
    rating: 'pg-13',
    ...(search ? { q: search, lang: 'en' } : {}),
  }).toString();
  return url;
}
