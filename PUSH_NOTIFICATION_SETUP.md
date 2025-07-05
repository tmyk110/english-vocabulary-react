# サーバーサイドプッシュ通知 セットアップガイド

このドキュメントでは、Supabaseを使ったサーバーサイドプッシュ通知の設定方法を説明します。

## 概要

従来のクライアントサイドタイマーによる通知から、サーバーサイドプッシュ通知に移行しました。これにより、以下の利点があります：

- ブラウザを閉じていても通知が届く
- Service Workerが終了していても通知が確実に送信される
- より信頼性の高い通知システム

## 必要なセットアップ

### 1. データベーススキーマの更新

`supabase-schema.sql` を実行して、必要なテーブルを作成してください：

- `push_subscriptions`: プッシュ通知サブスクリプション情報
- `notification_settings`: ユーザーの通知設定

```sql
-- ファイルの内容をSupabaseのSQL Editorで実行
```

### 2. Edge Functionsのデプロイ

以下のEdge Functionsをデプロイしてください：

#### send-push-notification
```bash
supabase functions deploy send-push-notification
```

#### schedule-notifications
```bash
supabase functions deploy schedule-notifications
```

### 3. 環境変数の設定

Supabaseプロジェクトの設定で以下の環境変数を設定してください：

```
VAPID_PUBLIC_KEY=BJevmY3-1SKtE3tdsxuCdTLSvvYGVB8R9nKZs_QopHJT-cbIOFnUWb_Ntbn4nD-kNF5AjOuCPtQCr6Yg4_g1puw
VAPID_PRIVATE_KEY=gbAra-7Lyp_2tsIzdK0wKXdrRsv-02jM2beBLZ2R58s
```

### 4. クライアントサイドの環境変数

`.env` ファイルに以下を追加：

```
REACT_APP_VAPID_PUBLIC_KEY=BJevmY3-1SKtE3tdsxuCdTLSvvYGVB8R9nKZs_QopHJT-cbIOFnUWb_Ntbn4nD-kNF5AjOuCPtQCr6Yg4_g1puw
```

### 5. pg_cronの設定

毎日10時（JST）に通知を送信するため、pg_cronを設定します：

```sql
-- pg_cron拡張機能を有効化（管理者権限が必要）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 毎日1:00 AM UTC（日本時間10:00 AM）に実行
SELECT cron.schedule(
  'daily-vocabulary-notifications',
  '0 1 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/schedule-notifications',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('scheduled', true)
    );
  $$
);
```

## 動作フロー

1. **ユーザーが通知を有効化**
   - 通知許可を取得
   - プッシュサブスクリプションを作成
   - Supabaseデータベースに保存

2. **サーバーサイドスケジューリング**
   - pg_cronが毎日10時に`schedule-notifications`関数を呼び出し
   - `schedule-notifications`が`send-push-notification`関数を呼び出し

3. **プッシュ通知送信**
   - アクティブなサブスクリプションを取得
   - 各ユーザーの単語からランダム選択
   - Web Push Protocolでプッシュ通知を送信

4. **Service Workerでの受信**
   - `push`イベントでプッシュ通知を受信
   - 通知を表示
   - ユーザーアクション（復習、後で）を処理

## トラブルシューティング

### 通知が届かない場合

1. **ブラウザの通知設定を確認**
   - 通知が許可されているか
   - 集中モード/おやすみモードがオフか

2. **サブスクリプション状況を確認**
   - アプリのUIでサブスクリプション状況をチェック
   - データベースの`push_subscriptions`テーブルを確認

3. **Edge Functions のログを確認**
   - Supabaseダッシュボードでログを確認
   - エラーが発生していないかチェック

### デバッグ用の手動実行

```sql
-- 手動でプッシュ通知を送信
SELECT
  net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('manual', true)
  );
```

## セキュリティ考慮事項

- VAPIDキーは機密情報として扱ってください
- Service Role Keyは絶対にクライアントサイドで使用しないでください
- プッシュ通知の内容に個人情報を含めないよう注意してください

## パフォーマンス最適化

- 無効なサブスクリプション（410 Gone）は自動的に無効化されます
- バッチ処理により複数ユーザーへの通知を効率的に送信します
- エラーハンドリングにより、一部の失敗が全体に影響しないようにしています