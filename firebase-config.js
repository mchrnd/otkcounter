// Firebase設定ファイル
// このファイルを実際のFirebaseプロジェクト設定に合わせて更新してください

export const firebaseConfig = {
    apiKey: "AIzaSyC4xFRjDTO8blmWriavMIxbFuwlzZvRB3g",
    authDomain: "mycountertest.firebaseapp.com",
    databaseURL: "https://mycountertest-default-rtdb.firebaseio.com",
    projectId: "mycountertest",
    storageBucket: "mycountertest.firebasestorage.app",
    messagingSenderId: "451353299994",
    appId: "1:451353299994:web:4c4b6ca04e09483bf5d5a3",
    measurementId: "G-ZYY84567ZK"
};

// 設定の説明

export const configInfo = {
    // Firebaseコンソールで以下の手順で設定を取得できます：
    // 1. プロジェクト設定（⚙️アイコン）をクリック
    // 2. 「全般」タブで「アプリを追加」→「Web」を選択
    // 3. アプリ名を入力して「アプリを登録」
    // 4. 表示される設定オブジェクトをコピーして上記のfirebaseConfigに貼り付け
    
    // Realtime Databaseの設定：
    // 1. 「Realtime Database」を選択
    // 2. 「データベースを作成」をクリック
    // 3. セキュリティルールを「テストモードで開始」に設定
    // 4. リージョンを選択（推奨：asia-northeast1）
    
    // セキュリティルールの設定例：
    // {
    //   "rules": {
    //     "counters": {
    //       ".read": true,
    //       ".write": true
    //     }
    //   }
    // }
};
