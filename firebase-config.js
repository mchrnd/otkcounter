// Firebase設定
// このファイルを実際のFirebaseプロジェクト設定に合わせて更新してください

// 方法1: 直接設定（推奨）
const firebaseConfig = {
  apiKey: "AIzaSyC4xFRjDTO8blmWriavMIxbFuwlzZvRB3g",
  authDomain: "mycountertest.firebaseapp.com",
  projectId: "mycountertest",
  storageBucket: "mycountertest.firebasestorage.app",
  messagingSenderId: "451353299994",
  appId: "1:451353299994:web:4c4b6ca04e09483bf5d5a3"
};

// 方法2: 環境変数を使用（開発環境のみ）
// const firebaseConfig = {
//   apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "your-api-key-here",
//   authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
//   projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "your-project-id",
//   storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
//   messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
//   appId: process.env.REACT_APP_FIREBASE_APP_ID || "your-app-id"
// };

// 設定の検証
function validateConfig() {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => 
    !firebaseConfig[field] || firebaseConfig[field].includes('your-')
  );
  
  if (missingFields.length > 0) {
    console.warn('Firebase設定が不完全です。以下の項目を設定してください:', missingFields);
    console.warn('firebase-config.jsを直接編集してください。');
    return false;
  }
  
  return true;
}

// 設定をエクスポート
export { firebaseConfig, validateConfig };

// 設定の説明
export const configHelp = `
Firebase設定について:

1. Firebase Console (https://console.firebase.google.com/) でプロジェクトを作成
2. プロジェクト設定 > 全般 > マイアプリでWebアプリを追加
3. 表示される設定情報をfirebase-config.jsに設定

設定手順:
1. Firebase Consoleにアクセス
2. プロジェクトを作成（または既存プロジェクトを選択）
3. プロジェクト設定（⚙️アイコン）をクリック
4. 「全般」タブで「アプリを追加」→「Web」を選択
5. アプリ名を入力（例：「Counter App」）
6. 「アプリを登録」をクリック
7. 表示される設定オブジェクトをコピー
8. firebase-config.jsのfirebaseConfigオブジェクトを更新

必要なサービス:
- Authentication（認証）
- Firestore Database（データベース）

セキュリティルール:
Firestore Databaseのセキュリティルールを設定してください。
詳細はREADME.mdを参照してください。

注意: 本番環境では必ず適切なセキュリティルールを設定してください。
`;