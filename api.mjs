export function buildGiphyUrl(requestUrl, apiKey) {
  const input = new URL(requestUrl, 'http://localhost');
  const type = input.searchParams.get('type') === 'stickers' ? 'stickers' : 'gifs';
  const query = (input.searchParams.get('q') || '').trim().slice(0, 200);
  const rawOffset = Number(input.searchParams.get('offset') || 0);
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 4999) : 0;
  const url = new URL(`https://api.giphy.com/v1/${type}/${query ? 'search' : 'trending'}`);
  url.search = new URLSearchParams({
    api_key: apiKey, limit: '24', offset: String(offset), rating: 'pg-13',
    ...(query ? { q: query, lang: 'en' } : {}),
  }).toString();
  return url;
}

export async function fetchGiphy(requestUrl, apiKey) {
  if (!apiKey) return { status: 503, body: { error: 'Add your GIPHY API key to .env to start exploring.' } };
  try {
    const response = await fetch(buildGiphyUrl(requestUrl, apiKey), { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      console.error(`GIPHY returned HTTP ${response.status}`);
      const error = response.status === 429
        ? 'GIPHY is getting a lot of requests. Please try again in a moment.'
        : response.status === 401 || response.status === 403
          ? 'GIPHY could not authorize this API key. Check your API key and its access in the GIPHY developer dashboard.'
          : 'GIPHY is unavailable right now. Please try again.';
      return { status: response.status === 429 ? 429 : 502, body: { error } };
    }
    const data = await response.json();
    return { status: 200, body: data };
  } catch (error) {
    console.error('GIPHY request failed:', error instanceof Error ? error.message : 'Unknown error');
    return { status: 502, body: { error: 'Unable to reach GIPHY. Please check your connection and try again.' } };
  }
}
