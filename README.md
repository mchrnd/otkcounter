# Sync Counter App

リアルタイム同期機能付きカウンターアプリケーション

## 機能

- カウンターの追加・削除・編集
- リアルタイム同期（Firebase Realtime Database）
- ローカルファイル保存・読み込み
- レスポンシブデザイン

## Firebase設定手順

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例：「counter-app-demo」）
4. Google Analyticsの設定（オプション）
5. 「プロジェクトを作成」をクリック

### 2. Realtime Databaseの設定

1. Firebaseコンソールで「Realtime Database」を選択
2. 「データベースを作成」をクリック
3. セキュリティルールを「テストモードで開始」に設定
4. リージョンを選択（推奨：asia-northeast1）

### 3. Webアプリの追加

1. Firebaseコンソールで「プロジェクト設定」（⚙️アイコン）をクリック
2. 「全般」タブで「アプリを追加」→「Web」を選択
3. アプリ名を入力（例：「Counter App」）
4. 「アプリを登録」をクリック

### 4. 設定ファイルの更新

1. `firebase-config.js` ファイルを開く
2. Firebaseコンソールで表示された設定オブジェクトをコピー
3. `firebaseConfig` オブジェクトの値を実際の設定に置き換える

```javascript
export const firebaseConfig = {
    apiKey: "実際のAPIキー",
    authDomain: "実際のプロジェクトID.firebaseapp.com",
    databaseURL: "https://実際のプロジェクトID-default-rtdb.firebaseio.com",
    projectId: "実際のプロジェクトID",
    storageBucket: "実際のプロジェクトID.appspot.com",
    messagingSenderId: "実際のSenderID",
    appId: "実際のAppID"
};
```

### 5. セキュリティルールの設定

Realtime Databaseの「ルール」タブで以下のルールを設定：

```json
{
  "rules": {
    "counters": {
      ".read": true,
      ".write": true
    }
  }
}
```

## 使用方法

1. `index.html` をブラウザで開く
2. カウンターを追加・操作
3. 「同期」ボタンでFirebase同期を有効化
4. 「ファイル保存」ボタンでローカルファイルに保存

## 注意事項

- Firebase設定を正しく行わないと同期機能が動作しません
- テストモードのセキュリティルールは本番環境では使用しないでください
- 無料プランの使用制限にご注意ください

## トラブルシューティング

### 同期が動作しない場合

1. Firebase設定が正しく設定されているか確認
2. ブラウザのコンソールでエラーメッセージを確認
3. Realtime Databaseが作成されているか確認
4. セキュリティルールが適切に設定されているか確認

