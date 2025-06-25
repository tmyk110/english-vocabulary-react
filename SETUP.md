# 🚀 Supabase セットアップガイド

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインイン
4. 「New project」をクリック
5. Organization を選択（個人の場合は自分のアカウント）
6. プロジェクト名を入力（例：english-vocabulary-app）
7. データベースパスワードを設定（安全なパスワードを生成）
8. リージョンを選択（Asia-Pacific (Tokyo) 推奨）
9. 「Create new project」をクリック

## 2. データベーステーブルの作成

1. Supabaseダッシュボードの左サイドバーから「SQL Editor」をクリック
2. 「New query」をクリック
3. `supabase-schema.sql` の内容をコピー＆ペースト
4. 「Run」をクリックしてテーブルを作成

## 3. 環境変数の設定

1. Supabaseダッシュボードの左サイドバーから「Settings」→「API」をクリック
2. 以下の値をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. プロジェクトルートの `.env` ファイルを編集：
```bash
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. セキュリティ設定

### ローカル開発
- `.env` ファイルは `.gitignore` に含まれているため、Gitにコミットされません
- 認証情報は安全にローカルに保存されます

### 本番環境（GitHub Pages）
GitHub Pagesではサーバーサイドの環境変数は使用できないため、以下の方法があります：

#### オプション1: Reactの環境変数（推奨）
GitHub リポジトリの Settings → Secrets and variables → Actions で以下を設定：
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

#### オプション2: 設定ファイル
本番用の設定ファイルを作成し、デプロイ時に差し替える

## 5. Row Level Security (RLS) の設定

現在は全てのユーザーがデータにアクセス可能です。本格運用時は以下を検討：

```sql
-- 全ユーザーアクセスポリシーを削除
DROP POLICY "Allow all operations" ON vocabulary_words;

-- 認証済みユーザーのみアクセス可能にする例
CREATE POLICY "Authenticated users can manage words" 
ON vocabulary_words FOR ALL 
USING (auth.role() = 'authenticated');
```

## 6. 動作確認

1. `npm start` でアプリを起動
2. 単語を登録してSupabaseダッシュボードの「Table Editor」で確認
3. ブラウザの開発者ツールでエラーがないことを確認

## トラブルシューティング

### 接続エラーが発生する場合
1. `.env` ファイルの値が正しいか確認
2. プロジェクトが正常に作成されているか確認
3. RLSポリシーが適切に設定されているか確認

### 本番環境で動作しない場合
1. GitHub Actions の環境変数が設定されているか確認
2. ビルド時に環境変数が読み込まれているか確認