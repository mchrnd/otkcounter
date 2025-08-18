# Sync Counter - ラベル管理型カウンターアプリ

リアルタイム同期機能とラベル管理機能を備えたカウンターアプリケーションです。

## 機能

### 🔐 認証機能
- **メール・パスワード認証**: 従来のログイン方式
- **Google認証**: ソーシャルログイン
- **ゲストモード**: ログインなしでも使用可能
- **パスワードリセット**: メール送信によるリセット機能

### 🏷️ ラベル管理
- **カスタムラベル**: 色付きのラベルを作成・管理
- **カウンター分類**: 複数のラベルをカウンターに適用
- **視覚的フィルタリング**: ラベルによるカウンターの整理

### 📊 カウンター機能
- **詳細設定**: 説明、カテゴリ、色、アイコンを設定
- **リアルタイム編集**: カウンター名と値を直接編集
- **インクリメント/デクリメント**: +1/-1ボタン
- **リセット機能**: カウンター値を0にリセット

### ☁️ Firebase統合
- **リアルタイム同期**: 複数デバイス間でのデータ同期
- **オフライン対応**: ネットワーク切断時も動作
- **セキュリティ**: ユーザー別のデータ分離
- **自動バックアップ**: クラウドへの自動保存

### 💾 ローカル機能
- **ファイル保存**: JSON形式でのエクスポート
- **ファイル読み込み**: バックアップからの復元
- **ローカルストレージ**: ブラウザ内でのデータ保存

## セットアップ

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. Webアプリを追加
4. 認証機能を有効化（メール・パスワード、Google）
5. Firestore Databaseを作成

### 2. 設定ファイルの更新

`firebase-config.js` を編集して、Firebaseプロジェクトの設定を追加：

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 3. セキュリティルールの設定

Firestore Databaseのセキュリティルールを設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /counters/{counterId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }
    
    match /labels/{labelId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## 使用方法

### 基本操作

1. **カウンター追加**: 下部のフォームでカウンター名を入力
2. **詳細設定**: 「詳細設定を表示」で説明、カテゴリ、ラベルを設定
3. **カウント操作**: +1/-1ボタンで値を変更
4. **直接編集**: 「編集」ボタンで値を直接入力

### ラベル管理

1. **ラベル作成**: 「ラベル」ボタンでラベル管理画面を開く
2. **色設定**: カラーピッカーでラベルの色を選択
3. **カウンターに適用**: カウンター作成時にラベルを選択

### 認証機能

1. **アカウント作成**: 「アカウント」ボタンで認証画面を開く
2. **ログイン**: メール・パスワードまたはGoogleでログイン
3. **データ同期**: ログイン後、自動的にFirebaseと同期

## ファイル構成

```
otkcounter/
├── index.html          # メインHTMLファイル
├── app.js              # アプリケーションロジック
├── firebase-config.js  # Firebase設定
├── firebase_integration.js # Firebase統合機能
├── style.css           # スタイルシート
└── README.md           # このファイル
```

## 技術仕様

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **UIフレームワーク**: Tailwind CSS
- **バックエンド**: Firebase (Authentication, Firestore)
- **リアルタイム通信**: Firebase Realtime Database
- **オフライン対応**: Service Worker (将来実装予定)

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## 更新履歴

### v2.0.0
- Firebase統合機能を追加
- 認証機能を実装
- ラベル管理機能を追加
- カウンター詳細設定を追加
- UI/UXを大幅に改善

### v1.0.0
- 基本的なカウンター機能
- ローカルファイル保存
- リアルタイム同期（Firebase Realtime Database）
