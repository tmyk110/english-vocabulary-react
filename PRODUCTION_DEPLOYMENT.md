# 本番環境デプロイメントガイド

## FCMプッシュ通知を本番環境で動作させる手順

### 1. 前提条件

- **HTTPS必須**: FCMはHTTPS環境でのみ動作します
- **ドメイン必須**: localhost以外のドメインが必要

### 2. 推奨デプロイメント方法

#### GitHub Pages（推奨）

1. **リポジトリ設定**:
   ```bash
   npm run build
   npm run deploy
   ```

2. **GitHub Pages設定**:
   - GitHub Repository → Settings → Pages
   - Source: Deploy from a branch
   - Branch: gh-pages

3. **HTTPS URL**: `https://username.github.io/english-vocabulary-react/`

#### Vercel

1. **Vercelデプロイ**:
   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **環境変数設定**:
   - Vercel Dashboard → Project → Settings → Environment Variables
   - すべての `REACT_APP_*` 環境変数を設定

#### Netlify

1. **Netlifyデプロイ**:
   - GitHub連携でリポジトリをデプロイ
   - Build command: `npm run build`
   - Publish directory: `build`

### 3. Firebase Service Worker設定（本番環境）

本番環境では `public/firebase-messaging-sw.js` が正常に動作します：

```javascript
// 本番環境では自動的に正しいMIMEタイプで配信される
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');
```

### 4. デプロイ後の確認

1. **FCMトークン取得**: 本番環境で実際のFCMトークンが取得されることを確認
2. **Service Worker**: Developer Tools → Application → Service Workers で登録確認
3. **通知テスト**: 実際にプッシュ通知が届くことを確認

### 5. 環境別設定

```env
# .env.production
REACT_APP_FIREBASE_API_KEY=本番用キー
REACT_APP_FIREBASE_AUTH_DOMAIN=本番用ドメイン
REACT_APP_FIREBASE_PROJECT_ID=本番用プロジェクトID
```

### 6. トラブルシューティング

#### Service Worker登録失敗
- **原因**: HTTPSでないか、Service Workerファイルが見つからない
- **解決**: HTTPS環境で `public/firebase-messaging-sw.js` が正しく配置されているか確認

#### FCMトークン取得失敗
- **原因**: VAPIDキーが無効か、通知許可が拒否されている
- **解決**: Firebase Console → Project Settings → Cloud Messaging でVAPIDキーを確認

#### プッシュ通知が届かない
- **原因**: Edge Functionの環境変数が正しく設定されていない
- **解決**: Supabase Dashboard → Edge Functions → Secrets で設定確認

### 7. パフォーマンス最適化

```bash
# ビルド最適化
npm run build

# バンドルサイズ確認
npm install -g source-map-explorer
npm run build
npx source-map-explorer 'build/static/js/*.js'
```

### 8. セキュリティ考慮事項

- **Firebase設定**: 本番環境では適切なFirebase Rulesを設定
- **Environment Variables**: 秘匿情報は適切に管理
- **CORS設定**: Supabase Edge Functionsで適切なCORS設定

## まとめ

開発環境では制限がありますが、本番環境（HTTPS）では完全なFCMプッシュ通知システムが動作します。GitHub Pagesへのデプロイが最も簡単で確実な方法です。