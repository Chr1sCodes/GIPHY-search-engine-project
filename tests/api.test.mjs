import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGiphyUrl } from '../api.mjs';

test('builds the GIF and sticker trending endpoint URLs', () => {
  const gifs = buildGiphyUrl({ apiKey: 'test-key' });
  const stickers = buildGiphyUrl({ apiKey: 'test-key', type: 'stickers' });

  assert.equal(gifs.href, 'https://api.giphy.com/v1/gifs/trending?api_key=test-key&limit=24&offset=0&rating=pg-13');
  assert.equal(stickers.pathname, '/v1/stickers/trending');
});

test('builds encoded GIF and sticker search URLs with pagination', () => {
  const gifs = buildGiphyUrl({ apiKey: 'test-key', query: 'happy cats & dogs', offset: 24 });
  const stickers = buildGiphyUrl({ apiKey: 'test-key', query: 'party', type: 'stickers' });

  assert.equal(gifs.pathname, '/v1/gifs/search');
  assert.equal(gifs.searchParams.get('q'), 'happy cats & dogs');
  assert.equal(gifs.searchParams.get('offset'), '24');
  assert.equal(stickers.pathname, '/v1/stickers/search');
  assert.equal(stickers.searchParams.get('q'), 'party');
});

test('bounds pagination and search length', () => {
  for (const offset of [-2, 1.2, Infinity, NaN]) {
    assert.equal(buildGiphyUrl({ apiKey: 'test', offset }).searchParams.get('offset'), '0');
  }
  assert.equal(buildGiphyUrl({ apiKey: 'test', offset: 9000 }).searchParams.get('offset'), '4999');
  assert.equal(buildGiphyUrl({ apiKey: 'test', query: 'x'.repeat(60) }).searchParams.get('q').length, 50);
});
