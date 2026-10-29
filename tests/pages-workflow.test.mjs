import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const workflow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
const configurationCheck = workflow.match(/run: \|\n([\s\S]*?)      - name: Install dependencies/)[1];

test('missing API endpoint warns without failing the Pages build', () => {
  const result = spawnSync('bash', ['-e', '-c', configurationCheck], {
    env: { ...process.env, VITE_API_URL: '' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /::warning::.*deployment will be skipped/);
});

test('configured API endpoint passes without a warning', () => {
  const result = spawnSync('bash', ['-e', '-c', configurationCheck], {
    env: { ...process.env, VITE_API_URL: 'https://api.example.com' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});

test('Pages deployment requires the API endpoint variable', () => {
  assert.match(workflow, /\n  deploy:\n    if: \$\{\{ vars\.VITE_API_URL != '' \}\}/);
  assert.match(workflow, /VITE_API_URL: \$\{\{ vars\.VITE_API_URL \}\}\n        run: npm run build:pages/);
});
