const { STATUS_CODES } = require('node:http');

const SUPPORTED_LANGUAGES = ['en', 'ja'];

const JA_STATUS_TEXT = {
  100: '継続', 101: 'プロトコル切替', 102: '処理中', 103: '早期ヒント',
  200: '成功', 201: '作成済み', 202: '受理済み', 203: '信頼できない情報',
  204: '内容なし', 205: '内容をリセット', 206: '部分的内容', 207: '複数ステータス',
  208: '報告済み', 226: 'IM 使用済み',
  300: '複数の選択肢', 301: '恒久的に移動', 302: '発見', 303: 'ほかを参照',
  304: '未変更', 305: 'プロキシを使用', 307: '一時的リダイレクト', 308: '恒久的リダイレクト',
  400: '不正なリクエスト', 401: '認証が必要', 402: '支払いが必要', 403: '禁止',
  404: '見つかりません', 405: '許可されていないメソッド', 406: '受理できません',
  407: 'プロキシ認証が必要', 408: 'リクエストタイムアウト', 409: '競合',
  410: '消滅', 411: '長さが必要', 412: '前提条件に失敗', 413: 'コンテンツが大きすぎます',
  414: 'URI が長すぎます', 415: '未対応のメディアタイプ', 416: '範囲を満たせません',
  417: '期待に沿えません', 418: '私はティーポットです', 421: '誤った宛先のリクエスト',
  422: '処理できないコンテンツ', 423: 'ロック済み', 424: '依存関係の失敗',
  425: '早すぎます', 426: 'アップグレードが必要', 428: '前提条件が必要',
  429: 'リクエストが多すぎます', 431: 'リクエストヘッダーが大きすぎます',
  451: '法的理由により利用不可',
  500: '内部サーバーエラー', 501: '未実装', 502: '不正なゲートウェイ',
  503: 'サービス利用不可', 504: 'ゲートウェイタイムアウト', 505: 'HTTP バージョン未対応',
  506: 'バリアントもネゴシエートします', 507: '容量不足', 508: 'ループを検出',
  510: '拡張が必要', 511: 'ネットワーク認証が必要'
};

const COPY = {
  en: {
    title: 'HTTP status response',
    requested: 'Requested status',
    reason: 'Reason',
    language: 'Language',
    unknown: 'Unassigned status code',
    invalid: 'The status code must be an integer from 100 through 599.',
    informational: 'A 1xx response is interim and cannot be the final response. This endpoint emits the informational response when the runtime supports it, then returns 200 as the required final response.',
    classes: {
      1: 'The request was received and processing is continuing.',
      2: 'The request was successfully received, understood, and accepted.',
      3: 'Further action is needed to complete the request.',
      4: 'The request could not be fulfilled because of a client-side condition.',
      5: 'The server failed to fulfill an apparently valid request.'
    }
  },
  ja: {
    title: 'HTTP ステータスレスポンス',
    requested: '指定されたステータス',
    reason: '理由',
    language: '言語',
    unknown: '未割り当てのステータスコード',
    invalid: 'ステータスコードには 100 から 599 までの整数を指定してください。',
    informational: '1xx は最終応答ではなく中間応答です。このエンドポイントは実行環境が対応する場合に中間応答を送り、その後、必須の最終応答として 200 を返します。',
    classes: {
      1: 'リクエストを受信し、処理を続けています。',
      2: 'リクエストを正常に受信し、理解して受理しました。',
      3: 'リクエストを完了するには追加の操作が必要です。',
      4: 'クライアント側の条件により、リクエストを処理できませんでした。',
      5: 'サーバーは妥当なリクエストの処理に失敗しました。'
    }
  }
};

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeLanguage(value) {
  if (!value || typeof value !== 'string') return null;
  return value.trim().toLowerCase().split('-')[0];
}

function resolveLanguage(req) {
  const requested = normalizeLanguage(first(req.query?.lang));
  if (requested) {
    return {
      language: SUPPORTED_LANGUAGES.includes(requested) ? requested : 'en',
      requestedLanguage: requested,
      fallback: !SUPPORTED_LANGUAGES.includes(requested)
    };
  }

  const accepted = String(req.headers?.['accept-language'] || '')
    .split(',')
    .map((part) => normalizeLanguage(part.split(';')[0]))
    .find((lang) => SUPPORTED_LANGUAGES.includes(lang));

  return {
    language: accepted || 'en',
    requestedLanguage: null,
    fallback: false
  };
}

function parseStatusCode(value) {
  const raw = String(first(value) ?? '');
  if (!/^\d{3}$/.test(raw)) return null;
  const code = Number(raw);
  return code >= 100 && code <= 599 ? code : null;
}

function statusText(code, language) {
  if (language === 'ja') return JA_STATUS_TEXT[code] || COPY.ja.unknown;
  return STATUS_CODES[code] || COPY.en.unknown;
}

function statusDescription(code, language) {
  return COPY[language].classes[Math.floor(code / 100)];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

module.exports = {
  COPY,
  SUPPORTED_LANGUAGES,
  escapeHtml,
  parseStatusCode,
  resolveLanguage,
  statusDescription,
  statusText
};

