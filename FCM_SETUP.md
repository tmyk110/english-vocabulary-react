# Firebase Cloud Messaging (FCM) HTTP v1 API セットアップガイド

このガイドでは、英単語学習アプリでFCM HTTP v1 APIを使用したプッシュ通知を設定する手順を説明します。

## 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例：english-vocabulary-app）
4. Google Analyticsは必要に応じて設定
5. プロジェクトを作成

## 2. Firebase設定の取得

1. プロジェクト概要 → 歯車アイコン → プロジェクトの設定
2. 「全般」タブで「ウェブアプリ」を追加
3. アプリ名を入力（例：English Vocabulary React App）
4. Firebase Hostingは不要なのでチェックを外す
5. 設定オブジェクトをコピー

## 3. 環境変数の設定

`.env`ファイルの以下の値を更新：

```env
REACT_APP_FIREBASE_API_KEY=your-actual-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

## 4. FCM VAPIDキーの取得

1. Firebase Console → プロジェクト設定 → Cloud Messaging タブ
2. 「ウェブ設定」セクションで「ウェブプッシュ証明書」を生成
3. 生成されたキーペアから「キーペア」をコピー
4. `.env`に追加：

```env
REACT_APP_FIREBASE_VAPID_KEY=your-vapid-key
```

## 5. FCM HTTP v1 API用サービスアカウントキーの取得

⚠️ **重要**: レガシーサーバーキーは廃止されたため、サービスアカウントキーを使用します。

1. Firebase Console → プロジェクト設定 → サービス アカウント タブ
2. 「Firebase Admin SDK」セクションで「新しい秘密鍵の生成」をクリック
3. JSONファイルがダウンロードされます
4. JSONファイルの内容をコピーして、Supabase Dashboard → Edge Functions → Secrets に以下を追加：

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}
```

**注意**: FIREBASE_SERVICE_ACCOUNT_KEYには、ダウンロードしたJSONファイルの全内容を1行の文字列として設定してください。

## 6. Service Workerファイルの更新

`public/firebase-messaging-sw.js`ファイルの設定部分を実際の値に更新：

```javascript
firebase.initializeApp({
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
});
```

## 7. データベースマイグレーションの実行

```bash
cd supabase
npx supabase db push
```

## 8. Edge Functionのデプロイ

```bash
cd supabase
npx supabase functions deploy send-fcm-notification
```

## 9. pg_cronスケジューリングの設定

Supabase SQL Editorで以下を実行：

```sql
-- 毎日日本時間10時にFCM通知を送信
-- UTCで1時（JST 10時）にスケジュール
SELECT cron.schedule(
  'daily-vocabulary-fcm-notification',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ykkgzosomqgikoxyhflm.supabase.co/functions/v1/send-fcm-notification',
    headers := '{"Authorization": "Bearer ' || (SELECT secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY') || '", "Content-Type": "application/json"}',
    body := '{"scheduled": true}'
  );
  $$
);
```

## 10. テストと確認

1. アプリをリロード
2. 通知システム選択で「Firebase Cloud Messaging (推奨)」を選択
3. 「FCM通知を設定する」ボタンをクリック
4. ブラウザの通知許可を承認
5. 「FCMテスト送信」ボタンで動作確認

## トラブルシューティング

### 通知が届かない場合

1. ブラウザの通知設定を確認
2. FCMトークンがデータベースに保存されているか確認
3. Supabase Edge Function logsでエラーを確認
4. Firebase Console → Cloud Messaging で送信状況を確認

### よくあるエラー

- **Invalid FCM Server Key**: サーバーキーが正しく設定されているか確認
- **Token registration error**: FCMトークンの生成に失敗。VAPIDキーを確認
- **CORS エラー**: Supabase Edge Functionの設定を確認

## セキュリティ考慮事項

- Firebase設定情報は公開情報なので、`.env`での管理で問題ありません
- FCMサーバーキーは秘匿情報なので、Supabase Secretsで管理
- 実際のプロダクション環境では、Firebase Rulesでセキュリティを強化してください

## 参考リンク

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Web Push Protocol](https://web.dev/push-notifications/)