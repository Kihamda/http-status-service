# HTTP Status Service

指定した HTTP ステータスコードを HTML または JSON で返す、Vercel Functions 向けの小さな REST サービスです。

## Routes

```text
GET /html/{statuscode}?lang=xx
GET /json/{statuscode}?lang=xx
HEAD /html/{statuscode}?lang=xx
HEAD /json/{statuscode}?lang=xx
```

例:

```text
/html/404?lang=ja
/json/201?lang=en
```

- 有効なコード範囲は RFC 9110 に従い `100`〜`599` です。
- `200`〜`599` は指定したコードを最終応答として返します。
- `204`、`205`、`304` と `HEAD` は本文を返しません。
- `1xx` は中間応答であり、最終応答にはできません。実行環境が対応している場合は `100`、`102`、`103` を中間応答として送り、その後に説明を含む `200` を最終応答として返します。
- `lang` は `en` と `ja` に対応しています。未対応の値は英語へフォールバックします。
- `lang` を省略した場合は `Accept-Language` を参照し、判定できなければ英語を使います。

## Local development

Vercel CLI が利用できる環境では、次のコマンドで起動できます。

```bash
vercel dev
```

外部依存関係や環境変数はありません。

