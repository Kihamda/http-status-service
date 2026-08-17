const assert = require('node:assert/strict');
const test = require('node:test');
const handler = require('../api/respond');

function request(code, format = 'json', options = {}) {
  const headers = {};
  let body;
  const res = {
    statusCode: 200,
    setHeader(name, value) { headers[name.toLowerCase()] = String(value); },
    end(value) { body = value; },
    writeContinue() { this.informational = 100; },
    writeProcessing() { this.informational = 102; },
    writeEarlyHints() { this.informational = 103; }
  };
  handler({
    method: options.method || 'GET',
    headers: options.headers || {},
    query: { code: String(code), format, ...(options.query || {}) }
  }, res);
  return { res, headers, body };
}

test('returns the requested final status as JSON', () => {
  const result = request(404, 'json', { query: { lang: 'ja' } });
  assert.equal(result.res.statusCode, 404);
  assert.equal(result.headers['content-language'], 'ja');
  assert.equal(JSON.parse(result.body).message, '見つかりません');
});

test('returns HTML with the requested final status', () => {
  const result = request(201, 'html', { query: { lang: 'en' } });
  assert.equal(result.res.statusCode, 201);
  assert.match(result.body, /201/);
  assert.match(result.headers['content-type'], /text\/html/);
});

test('does not send bodies for bodyless status codes', () => {
  for (const code of [204, 205, 304]) {
    const result = request(code);
    assert.equal(result.res.statusCode, code);
    assert.equal(result.body, undefined);
  }
});

test('emits a supported informational response and finishes with 200', () => {
  const result = request(103);
  assert.equal(result.res.informational, 103);
  assert.equal(result.res.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { status: 103, message: 'Early Hints' });
});

test('falls back to English for unsupported languages', () => {
  const result = request(418, 'json', { query: { lang: 'fr' } });
  assert.equal(result.headers['content-language'], 'en');
  assert.equal(result.headers['x-language-fallback'], undefined);
  assert.deepEqual(JSON.parse(result.body), { status: 418, message: "I'm a Teapot" });
});

test('rejects values outside the RFC status range', () => {
  const result = request(600);
  assert.equal(result.res.statusCode, 400);
  assert.equal(JSON.parse(result.body).status, 400);
});

