# Firebase設定ガイド

このガイドでは、カウンターアプリでFirebaseを使用するための設定手順を説明します。

## 📋 必要な設定項目

### 1. Firebaseプロジェクトの作成
### 2. Authentication（認証）の設定
### 3. Firestore Database（データベース）の設定
### 4. セキュリティルールの設定
### 5. アプリケーション設定の更新

---

## 🚀 設定手順

### ステップ1: Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例：「counter-app-demo」）
4. Google Analyticsの設定（オプション）
5. 「プロジェクトを作成」をクリック

### ステップ2: Webアプリの追加

1. Firebaseコンソールで「プロジェクト設定」（⚙️アイコン）をクリック
2. 「全般」タブで「アプリを追加」→「Web」を選択
3. アプリ名を入力（例：「Counter App」）
4. 「アプリを登録」をクリック
5. 表示される設定オブジェクトをコピー

### ステップ3: 設定ファイルの更新

1. `firebase-config.js` ファイルを開く
2. コピーした設定オブジェクトの値を`firebaseConfig`に設定

```javascript
const firebaseConfig = {
  apiKey: "実際のAPIキー",
  authDomain: "実際のプロジェクトID.firebaseapp.com",
  projectId: "実際のプロジェクトID",
  storageBucket: "実際のプロジェクトID.appspot.com",
  messagingSenderId: "実際のSenderID",
  appId: "実際のAppID"
};
```

### ステップ4: Authentication（認証）の設定

1. Firebaseコンソールで「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブで以下の認証方法を有効化：
   - **メール/パスワード**: 有効にする
   - **Google**: 有効にする（オプション）
4. 各認証方法の設定を完了

### ステップ5: Firestore Database（データベース）の設定

1. Firebaseコンソールで「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. セキュリティルールを「本番モードで開始」に設定
4. リージョンを選択（推奨：asia-northeast1）

### ステップ6: セキュリティルールの設定

1. Firestore Databaseで「ルール」タブを選択
2. 以下のルールを設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーコレクション
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // カウンターコレクション
    match /counters/{counterId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }
    
    // ラベルコレクション
    match /labels/{labelId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

3. 「公開」をクリック

---

## 🔧 設定の確認

### 設定が正しく動作するか確認

1. ブラウザで `index.html` を開く
2. ブラウザの開発者ツール（F12）でコンソールを確認
3. エラーメッセージがないことを確認
4. 「アカウント」ボタンで認証機能をテスト

### よくあるエラーと対処法

#### エラー1: "Firebase設定が不完全です"
- **原因**: `firebase-config.js`の設定が不完全
- **対処法**: 設定値を正しく入力

#### エラー2: "permission-denied"
- **原因**: セキュリティルールが正しく設定されていない
- **対処法**: Firestore Databaseのルールを確認・修正

#### エラー3: "auth/unauthorized-domain"
- **原因**: 認証ドメインが許可されていない
- **対処法**: Firebase Consoleで認証ドメインを追加

---

## 📁 ファイル構成

```
otkcounter/
├── index.html              # メインHTMLファイル
├── app.js                  # アプリケーションロジック
├── firebase-config.js      # Firebase設定
├── firebase_integration.js # Firebase統合機能
├── firestore.rules         # セキュリティルール
├── style.css              # スタイルシート
├── README.md              # 基本説明
└── FIREBASE_SETUP.md      # このファイル
```

---

## 🔒 セキュリティに関する注意事項

1. **APIキーの保護**: APIキーは公開されても問題ありませんが、適切なセキュリティルールを設定してください
2. **認証ドメイン**: 本番環境では適切なドメインのみを許可してください
3. **セキュリティルール**: 必ず適切なセキュリティルールを設定してください
4. **データバックアップ**: 重要なデータは定期的にバックアップしてください

---

## 🆘 トラブルシューティング

### 問題が解決しない場合

1. **ブラウザのキャッシュをクリア**
2. **開発者ツールでエラーを確認**
3. **Firebase Consoleで設定を再確認**
4. **セキュリティルールを一時的に緩和してテスト**

### サポート

問題が解決しない場合は、以下を確認してください：
- Firebase Consoleの設定
- ブラウザのコンソールエラー
- ネットワーク接続
- Firebaseプロジェクトの状態

---

## ✅ 設定完了チェックリスト

- [ ] Firebaseプロジェクトが作成されている
- [ ] Webアプリが追加されている
- [ ] `firebase-config.js`が正しく設定されている
- [ ] Authenticationが有効になっている
- [ ] Firestore Databaseが作成されている
- [ ] セキュリティルールが設定されている
- [ ] アプリケーションが正常に動作している
- [ ] 認証機能が動作している
- [ ] データの保存・読み込みが動作している

すべての項目にチェックが入れば、設定は完了です！
