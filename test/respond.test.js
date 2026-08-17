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
  assert.deepEqual(JSON.parse(result.body), {
    status: 404,
    message: 'Not Found',
    description: 'サーバーは要求されたリソースを見つけられません。'
  });
});

test('keeps the HTML heading in English and localizes its description', () => {
  const result = request(502, 'html', { query: { lang: 'ja' } });
  assert.equal(result.res.statusCode, 502);
  assert.match(result.body, /<h1>502 Bad Gateway<\/h1>/);
  assert.match(result.body, /上流サーバーから無効な応答/);
  assert.match(result.body, /トップページに戻る/);
  assert.doesNotMatch(result.body, /<style>/);
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
  assert.equal(JSON.parse(result.body).message, 'Early Hints');
});

test('returns a localized description while keeping the message in English', () => {
  const result = request(418, 'json', { query: { lang: 'fr' } });
  assert.equal(result.headers['content-language'], 'fr');
  assert.deepEqual(JSON.parse(result.body), {
    status: 418,
    message: "I'm a Teapot",
    description: 'Le serveur refuse de préparer du café parce que c’est une théière.'
  });
});

test('falls back silently to English for unsupported languages', () => {
  const result = request(404, 'json', { query: { lang: 'xx' } });
  assert.equal(result.headers['content-language'], 'en');
  assert.equal(result.headers['x-language-fallback'], undefined);
  assert.equal(JSON.parse(result.body).description, 'The server cannot find the requested resource.');
});

test('selects a supported Accept-Language value by quality', () => {
  const result = request(404, 'json', { headers: { 'accept-language': 'fr;q=0.5, zh-CN;q=0.9' } });
  assert.equal(result.headers['content-language'], 'zh-CN');
  assert.equal(JSON.parse(result.body).description, '服务器找不到请求的资源。');
});

test('rejects values outside the RFC status range', () => {
  const result = request(600);
  assert.equal(result.res.statusCode, 400);
  assert.equal(JSON.parse(result.body).status, 400);
});

