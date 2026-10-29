import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGiphyUrl, fetchGiphy } from '../api.mjs';

test('defaults to trending GIFs with a family-conscious rating', () => {
  const url = buildGiphyUrl('/api/giphy', 'test-key');
  assert.equal(url.pathname, '/v1/gifs/trending');
  assert.equal(url.searchParams.get('rating'), 'pg-13');
  assert.equal(url.searchParams.get('api_key'), 'test-key');
});
test('encodes search and supports stickers and pagination', () => {
  const url = buildGiphyUrl('/api/giphy?q=happy%20cats%20%26%20dogs&type=stickers&offset=24', 'test');
  assert.equal(url.pathname, '/v1/stickers/search');
  assert.equal(url.searchParams.get('q'), 'happy cats & dogs');
  assert.equal(url.searchParams.get('offset'), '24');
});
test('bounds pagination and prevents arbitrary upstream paths', () => {
  assert.equal(buildGiphyUrl('/api/giphy?offset=-10&type=../../users', 'test').pathname, '/v1/gifs/trending');
  for (const offset of ['-2', 'NaN', '1.2', 'Infinity']) {
    assert.equal(buildGiphyUrl(`/api/giphy?offset=${offset}`, 'test').searchParams.get('offset'), '0');
  }
  assert.equal(buildGiphyUrl('/api/giphy?offset=9000', 'test').searchParams.get('offset'), '4999');
});
test('missing API key produces an explicit configuration error', async () => {
  const result = await fetchGiphy('/api/giphy', '');
  assert.equal(result.status, 503);
  assert.match(result.body.error, /API key/);
});
test('returns successful upstream data', async context => {
  const data = { data: [{ id: 'example' }], pagination: { offset: 0, count: 1, total_count: 1 } };
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(data)));
  const result = await fetchGiphy('/api/giphy', 'test');
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, data);
});
test('reports rate limits without leaking credentials', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 429 }));
  context.mock.method(console, 'error', () => {});
  const result = await fetchGiphy('/api/giphy', 'private-test-key');
  assert.equal(result.status, 429);
  assert.match(result.body.error, /requests/);
  assert.ok(!JSON.stringify(result).includes('private-test-key'));
});
test('reports authorization failures explicitly', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 403 }));
  context.mock.method(console, 'error', () => {});
  const result = await fetchGiphy('/api/giphy', 'test');
  assert.equal(result.status, 502);
  assert.match(result.body.error, /authorize/);
});
test('network failures are not disguised as empty results', async context => {
  context.mock.method(globalThis, 'fetch', async () => { throw new Error('Network unavailable'); });
  context.mock.method(console, 'error', () => {});
  const result = await fetchGiphy('/api/giphy', 'test');
  assert.equal(result.status, 502);
  assert.match(result.body.error, /Unable to reach/);
  assert.equal(result.body.data, undefined);
});
