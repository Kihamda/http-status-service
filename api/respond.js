const {
  COPY,
  escapeHtml,
  parseStatusCode,
  resolveLanguage,
  statusDescription,
  statusText
} = require('./_shared');

const BODYLESS_CODES = new Set([204, 205, 304]);

function setCommonHeaders(res, language, requestedCode) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Accept-Language, Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Language', language);
  res.setHeader('Vary', 'Accept-Language');
  res.setHeader('X-Requested-Status', String(requestedCode));
}

function emitInformationalResponse(res, code) {
  if (code === 100 && typeof res.writeContinue === 'function') {
    res.writeContinue();
    return true;
  }
  if (code === 102 && typeof res.writeProcessing === 'function') {
    res.writeProcessing();
    return true;
  }
  if (code === 103 && typeof res.writeEarlyHints === 'function') {
    res.writeEarlyHints({ 'x-http-status': '103 Early Hints' });
    return true;
  }
  return false;
}

function htmlDocument(payload) {
  return `<!doctype html>
<html lang="${escapeHtml(payload.language)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${payload.status} ${escapeHtml(payload.message)}</title>
</head>
<body>
  <center>
    <h1>${payload.status} ${escapeHtml(payload.message)}</h1>
    <p>${escapeHtml(payload.description)}</p>
    <hr>
    <a href="https://kihamda.net/">Kihamda.net</a>
  </center>
</body>
</html>`;
}

function errorPayload(language) {
  return {
    status: 400,
    message: COPY[language].invalid
  };
}

module.exports = function handler(req, res) {
  const method = String(req.method || 'GET').toUpperCase();
  const format = String(Array.isArray(req.query?.format) ? req.query.format[0] : req.query?.format || 'json');
  const languageResult = resolveLanguage(req);
  const { language } = languageResult;
  const code = parseStatusCode(req.query?.code);

  setCommonHeaders(res, language, code || 400);

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!['GET', 'HEAD'].includes(method)) {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(method === 'HEAD' ? undefined : JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }

  if (!code || !['html', 'json'].includes(format)) {
    const payload = errorPayload(language);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(method === 'HEAD' ? undefined : JSON.stringify(payload, null, 2));
    return;
  }

  const informational = code < 200;
  if (informational) emitInformationalResponse(res, code);
  const payload = {
    status: code,
    message: statusText(code, language),
    description: statusDescription(code, language),
    language,
    finalStatus: informational ? 200 : code
  };

  res.statusCode = payload.finalStatus;
  if (informational) res.setHeader('X-Final-Status', '200');

  if (method === 'HEAD' || BODYLESS_CODES.has(code)) {
    if (code === 205) res.setHeader('Content-Length', '0');
    res.end();
    return;
  }

  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(htmlDocument(payload));
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ status: payload.status, message: payload.message }));
};

