// Firebase設定とSDK初期化
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  signInWithPopup,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  writeBatch,
  enableNetwork,
  disableNetwork,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

// Firebase設定（firebase-config.jsから読み込み）
import { firebaseConfig } from './firebase-config.js';

// Firebase初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// エラーハンドリングユーティリティ
class FirebaseErrorHandler {
  static getErrorMessage(error) {
    const errorMessages = {
      'auth/user-not-found': 'ユーザーが見つかりません',
      'auth/wrong-password': 'パスワードが間違っています',
      'auth/email-already-in-use': 'このメールアドレスは既に使用されています',
      'auth/weak-password': 'パスワードが弱すぎます（6文字以上必要）',
      'auth/invalid-email': 'メールアドレスが無効です',
      'auth/too-many-requests': 'リクエストが多すぎます。しばらく時間をおいてください',
      'auth/network-request-failed': 'ネットワークエラーが発生しました',
      'permission-denied': 'アクセス権限がありません',
      'unavailable': 'サービスが一時的に利用できません',
      'deadline-exceeded': 'リクエストがタイムアウトしました'
    };
    return errorMessages[error.code] || `エラーが発生しました: ${error.message}`;
  }
}

// 認証管理クラス
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    this.setupAuthStateListener();
  }

  // 認証状態監視
  setupAuthStateListener() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      
      if (user) {
        // ユーザー情報をFirestoreに保存/更新
        await this.updateUserDocument(user);
      }
      
      // 全てのリスナーに通知
      this.authStateListeners.forEach(callback => callback(user));
    });
  }

  // 認証状態リスナー追加
  addAuthStateListener(callback) {
    this.authStateListeners.push(callback);
    // 現在の状態を即座に通知
    callback(this.currentUser);
  }

  // ユーザー情報ドキュメント更新
  async updateUserDocument(user) {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      const userData = {
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        lastLoginAt: serverTimestamp()
      };

      if (!userDoc.exists()) {
        // 新規ユーザーの場合
        userData.createdAt = serverTimestamp();
        userData.preferences = {
          theme: 'light',
          language: 'ja',
          defaultView: 'grid'
        };
      }

      await updateDoc(userDocRef, userData);
    } catch (error) {
      console.error('ユーザー情報の更新に失敗:', error);
    }
  }

  // メール・パスワードでサインアップ
  async signUp(email, password, displayName = '') {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // プロフィール更新
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      // メール認証送信
      await sendEmailVerification(result.user);
      
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: FirebaseErrorHandler.getErrorMessage(error) };
    }
  }

  // メール・パスワードでサインイン
  async signIn(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: FirebaseErrorHandler.getErrorMessage(error) };
    }
  }

  // ソーシャル認証
  async signInWithProvider(providerType) {
    try {
      let provider;
      
      switch (providerType) {
        case 'google':
          provider = new GoogleAuthProvider();
          break;
        case 'github':
          provider = new GithubAuthProvider();
          break;
        case 'twitter':
          provider = new TwitterAuthProvider();
          break;
        default:
          throw new Error('サポートされていない認証プロバイダーです');
      }
      
      const result = await signInWithPopup(auth, provider);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: FirebaseErrorHandler.getErrorMessage(error) };
    }
  }

  // パスワードリセット
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'パスワードリセットメールを送信しました' };
    } catch (error) {
      return { success: false, error: FirebaseErrorHandler.getErrorMessage(error) };
    }
  }

  // サインアウト
  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: FirebaseErrorHandler.getErrorMessage(error) };
    }
  }
}

// データベース管理クラス
class DatabaseManager {
  constructor() {
    this.retryCount = 3;
    this.retryDelay = 1000;
  }

  // 再試行ロジック付きの操作実行
  async executeWithRetry(operation, retries = this.retryCount) {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(this.retryDelay);
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  // 再試行可能なエラーかチェック
  isRetryableError(error) {
    const retryableCodes = ['unavailable', 'deadline-exceeded', 'internal'];
    return retryableCodes.includes(error.code);
  }

  // 遅延関数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // カウンター操作
  async createCounter(counterData) {
    return this.executeWithRetry(async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('ユーザー認証が必要です');

      const counter = {
        ...counterData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true
      };

      const docRef = await addDoc(collection(db, 'counters'), counter);
      return { success: true, id: docRef.id };
    });
  }

  async updateCounter(counterId, updates) {
    return this.executeWithRetry(async () => {
      const counterRef = doc(db, 'counters', counterId);
      await updateDoc(counterRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    });
  }

  async deleteCounter(counterId) {
    return this.executeWithRetry(async () => {
      const counterRef = doc(db, 'counters', counterId);
      await updateDoc(counterRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    });
  }

  async incrementCounter(counterId, amount = 1) {
    return this.executeWithRetry(async () => {
      const counterRef = doc(db, 'counters', counterId);
      await updateDoc(counterRef, {
        value: increment(amount),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    });
  }

  // カウンター取得（リアルタイムリスナー付き）
  getCountersListener(callback, options = {}) {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    let q = query(
      collection(db, 'counters'),
      where('userId', '==', userId),
      where('isActive', '==', true),
      orderBy('updatedAt', 'desc')
    );

    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    return onSnapshot(q, 
      (snapshot) => {
        const counters = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback({ success: true, data: counters });
      },
      (error) => {
        callback({ success: false, error: FirebaseErrorHandler.getErrorMessage(error) });
      }
    );
  }

  // ラベル操作
  async createLabel(labelData) {
    return this.executeWithRetry(async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('ユーザー認証が必要です');

      const label = {
        ...labelData,
        userId,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'labels'), label);
      return { success: true, id: docRef.id };
    });
  }

  async updateLabel(labelId, updates) {
    return this.executeWithRetry(async () => {
      const labelRef = doc(db, 'labels', labelId);
      await updateDoc(labelRef, updates);
      return { success: true };
    });
  }

  async deleteLabel(labelId) {
    return this.executeWithRetry(async () => {
      const labelRef = doc(db, 'labels', labelId);
      await deleteDoc(labelRef);
      return { success: true };
    });
  }

  // ラベル取得
  getLabelsListener(callback) {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    const q = query(
      collection(db, 'labels'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q,
      (snapshot) => {
        const labels = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback({ success: true, data: labels });
      },
      (error) => {
        callback({ success: false, error: FirebaseErrorHandler.getErrorMessage(error) });
      }
    );
  }

  // バッチ操作
  async batchUpdateCounters(updates) {
    return this.executeWithRetry(async () => {
      const batch = writeBatch(db);

      updates.forEach(({ id, data }) => {
        const counterRef = doc(db, 'counters', id);
        batch.update(counterRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      return { success: true };
    });
  }

  // ユーザー設定操作
  async updateUserPreferences(preferences) {
    return this.executeWithRetry(async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('ユーザー認証が必要です');

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { preferences });
      return { success: true };
    });
  }

  async getUserPreferences() {
    return this.executeWithRetry(async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('ユーザー認証が必要です');

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { success: true, data: userDoc.data().preferences };
      }
      return { success: true, data: null };
    });
  }
}

// オフライン対応管理
class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.setupNetworkListeners();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      enableNetwork(db);
      console.log('オンラインに復帰しました');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      disableNetwork(db);
      console.log('オフラインになりました');
    });
  }

  getNetworkStatus() {
    return this.isOnline;
  }
}

// キャッシュ管理
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5分
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // TTLチェック
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }
}

// メインFirebaseサービスクラス
class FirebaseService {
  constructor() {
    this.auth = new AuthManager();
    this.db = new DatabaseManager();
    this.offline = new OfflineManager();
    this.cache = new CacheManager();
    this.listeners = new Map();
  }

  // 認証関連メソッド
  async signUp(email, password, displayName) {
    return this.auth.signUp(email, password, displayName);
  }

  async signIn(email, password) {
    return this.auth.signIn(email, password);
  }

  async signInWithProvider(provider) {
    return this.auth.signInWithProvider(provider);
  }

  async signOut() {
    // リスナーをクリーンアップ
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.cache.clear();
    
    return this.auth.signOut();
  }

  async resetPassword(email) {
    return this.auth.resetPassword(email);
  }

  onAuthStateChanged(callback) {
    this.auth.addAuthStateListener(callback);
  }

  // カウンター関連メソッド
  async createCounter(counterData) {
    return this.db.createCounter(counterData);
  }

  async updateCounter(counterId, updates) {
    return this.db.updateCounter(counterId, updates);
  }

  async deleteCounter(counterId) {
    return this.db.deleteCounter(counterId);
  }

  async incrementCounter(counterId, amount = 1) {
    return this.db.incrementCounter(counterId, amount);
  }

  subscribeToCounters(callback, options = {}) {
    const unsubscribe = this.db.getCountersListener(callback, options);
    if (unsubscribe) {
      this.listeners.set('counters', unsubscribe);
    }
    return unsubscribe;
  }

  // ラベル関連メソッド
  async createLabel(labelData) {
    return this.db.createLabel(labelData);
  }

  async updateLabel(labelId, updates) {
    return this.db.updateLabel(labelId, updates);
  }

  async deleteLabel(labelId) {
    return this.db.deleteLabel(labelId);
  }

  subscribeToLabels(callback) {
    const unsubscribe = this.db.getLabelsListener(callback);
    if (unsubscribe) {
      this.listeners.set('labels', unsubscribe);
    }
    return unsubscribe;
  }

  // ユーティリティメソッド
  isOnline() {
    return this.offline.getNetworkStatus();
  }

  clearCache() {
    this.cache.clear();
  }

  // バッチ操作
  async batchUpdateCounters(updates) {
    return this.db.batchUpdateCounters(updates);
  }

  // ユーザー設定
  async updateUserPreferences(preferences) {
    return this.db.updateUserPreferences(preferences);
  }

  async getUserPreferences() {
    return this.db.getUserPreferences();
  }
}

// シングルトンインスタンスとして提供
const firebaseService = new FirebaseService();

// 使用例とエクスポート
export default firebaseService;

// 個別エクスポート
export {
  FirebaseService,
  AuthManager,
  DatabaseManager,
  OfflineManager,
  CacheManager,
  FirebaseErrorHandler
};
