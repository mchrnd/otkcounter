// --- カウンターアプリ本体 ---
const STORAGE_KEY = 'counterAppData';
const counterListEl = document.getElementById('counter-list');
const addForm = document.getElementById('add-counter-form');
const newCounterNameInput = document.getElementById('new-counter-name');

// データ構造: [{id, name, description, count, category, color, icon, labels, createdAt, updatedAt}]
let counters = [];
let labels = [];
let currentUser = null;

// --- 直接編集モード用の状態 ---
let editCountId = null;

// --- Firebase同期状態 ---
let isSyncEnabled = false;
let syncListener = null;
let syncRef = null;

// --- UI状態管理 ---
let isDetailsExpanded = false;

// =============================
// 認証機能
// =============================

const authSection = document.getElementById('auth-section');
const authButton = document.getElementById('auth-button');
const authUserInfo = document.getElementById('auth-user-info');
const authGuestInfo = document.getElementById('auth-guest-info');
const userEmail = document.getElementById('user-email');
const signInBtn = document.getElementById('sign-in-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const signInForm = document.getElementById('sign-in-form');
const signUpForm = document.getElementById('sign-up-form');
const signUpBtn = document.getElementById('sign-up-btn');
const backToLoginBtn = document.getElementById('back-to-login-btn');
const googleSigninBtn = document.getElementById('google-signin-btn');
const forgotPasswordBtn = document.getElementById('forgot-password-btn');
const authMessage = document.getElementById('auth-message');

// 認証状態の更新
function updateAuthUI(user) {
    currentUser = user;
    
    if (user) {
        // ログイン状態
        authUserInfo.style.display = 'block';
        authGuestInfo.style.display = 'none';
        userEmail.textContent = user.email || 'ゲストユーザー';
        
        // Firebaseからデータを購読開始
        if (window.firebaseService) {
            window.firebaseService.subscribeToCounters(handleCounterUpdate);
            window.firebaseService.subscribeToLabels(handleLabelUpdate);
        }
    } else {
        // ログアウト状態
        authUserInfo.style.display = 'none';
        authGuestInfo.style.display = 'block';
        
        // ローカルデータを読み込み
        loadCounters();
        renderCounters();
    }
}

// 認証メッセージ表示
function showAuthMessage(message, isError = false) {
    if (authMessage) {
        authMessage.textContent = message;
        authMessage.style.color = isError ? 'red' : 'green';
        setTimeout(() => {
            authMessage.textContent = '';
        }, 5000);
    }
}

// ログインフォーム表示
function showLoginForm() {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
}

// 新規登録フォーム表示
function showSignupForm() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
}

// 認証UIイベントリスナー
if (authButton) {
    authButton.addEventListener('click', () => {
        if (authSection.style.display === 'none' || authSection.style.display === '') {
            authSection.style.display = 'block';
            authSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            authSection.style.display = 'none';
        }
    });
}

if (signInBtn) {
    signInBtn.addEventListener('click', showLoginForm);
}

if (signUpBtn) {
    signUpBtn.addEventListener('click', showSignupForm);
}

if (backToLoginBtn) {
    backToLoginBtn.addEventListener('click', showLoginForm);
}

if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
        if (window.firebaseService) {
            const result = await window.firebaseService.signOut();
            if (result.success) {
                showAuthMessage('ログアウトしました');
            } else {
                showAuthMessage(result.error, true);
            }
        }
    });
}

// ログインフォーム送信
if (signInForm) {
    signInForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (window.firebaseService) {
            const result = await window.firebaseService.signIn(email, password);
            if (result.success) {
                showAuthMessage('ログインしました');
                loginForm.style.display = 'none';
            } else {
                showAuthMessage(result.error, true);
            }
        }
    });
}

// 新規登録フォーム送信
if (signUpForm) {
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const displayName = document.getElementById('signup-displayname').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        if (window.firebaseService) {
            const result = await window.firebaseService.signUp(email, password, displayName);
            if (result.success) {
                showAuthMessage('アカウントを作成しました。メール認証を完了してください。');
                signupForm.style.display = 'none';
            } else {
                showAuthMessage(result.error, true);
            }
        }
    });
}

// Googleログイン
if (googleSigninBtn) {
    googleSigninBtn.addEventListener('click', async () => {
        if (window.firebaseService) {
            const result = await window.firebaseService.signInWithProvider('google');
            if (result.success) {
                showAuthMessage('Googleでログインしました');
                loginForm.style.display = 'none';
            } else {
                showAuthMessage(result.error, true);
            }
        }
    });
}

// パスワードリセット
if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        if (!email) {
            showAuthMessage('メールアドレスを入力してください', true);
            return;
        }
        
        if (window.firebaseService) {
            const result = await window.firebaseService.resetPassword(email);
            if (result.success) {
                showAuthMessage(result.message);
            } else {
                showAuthMessage(result.error, true);
            }
        }
    });
}

// =============================
// ラベル管理機能
// =============================

const labelSection = document.getElementById('label-section');
const labelButton = document.getElementById('label-button');
const addLabelForm = document.getElementById('add-label-form');
const newLabelName = document.getElementById('new-label-name');
const newLabelColor = document.getElementById('new-label-color');
const labelList = document.getElementById('label-list');
const availableLabels = document.getElementById('available-labels');

// ラベルUI表示切り替え
if (labelButton) {
    labelButton.addEventListener('click', () => {
        if (labelSection.style.display === 'none' || labelSection.style.display === '') {
            labelSection.style.display = 'block';
            labelSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            labelSection.style.display = 'none';
        }
    });
}

// ラベル追加
if (addLabelForm) {
    addLabelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = newLabelName.value.trim();
        const color = newLabelColor.value;
        
        if (!name) return;
        
        if (window.firebaseService && currentUser) {
            const result = await window.firebaseService.createLabel({
                name,
                color
            });
            if (result.success) {
                newLabelName.value = '';
                showMessage('フォルダーを追加しました');
            } else {
                showMessage(result.error, true);
            }
        } else {
            // ローカルモード
            const newLabel = {
                id: Date.now().toString(),
                name,
                color,
                createdAt: new Date().toISOString()
            };
            labels.push(newLabel);
            saveLabels();
            renderLabels();
            newLabelName.value = '';
        }
    });
}

// ラベル削除
function deleteLabel(labelId) {
    if (window.firebaseService && currentUser) {
        window.firebaseService.deleteLabel(labelId).then(result => {
            if (result.success) {
                showMessage('フォルダーを削除しました');
            } else {
                showMessage(result.error, true);
            }
        });
    } else {
        // ローカルモード
        labels = labels.filter(label => label.id !== labelId);
        saveLabels();
        renderLabels();
    }
}

// ラベル一覧描画
function renderLabels() {
    if (labelList) {
        labelList.innerHTML = '';
        labels.forEach(label => {
            const labelEl = document.createElement('div');
            labelEl.className = 'flex items-center justify-between p-3 bg-slate-50 rounded';
            labelEl.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded" style="background-color: ${label.color}"></div>
                    <span class="font-medium">${label.name}</span>
                </div>
                <button class="delete-label-btn bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 text-sm transition-all" data-id="${label.id}">削除</button>
            `;
            labelList.appendChild(labelEl);
        });
    }
    
    // 利用可能なラベルを更新
    updateAvailableLabels();
}

// 利用可能なラベルを更新
function updateAvailableLabels() {
    if (availableLabels) {
        availableLabels.innerHTML = '';
        labels.forEach(label => {
            const labelEl = document.createElement('div');
            labelEl.className = 'flex items-center gap-2 p-2 bg-slate-100 rounded cursor-pointer hover:bg-slate-200 transition-all';
            labelEl.innerHTML = `
                <input type="checkbox" id="label-${label.id}" value="${label.id}" class="label-checkbox">
                <div class="w-3 h-3 rounded" style="background-color: ${label.color}"></div>
                <label for="label-${label.id}" class="text-sm">${label.name}</label>
            `;
            availableLabels.appendChild(labelEl);
        });
    }
}

// ラベル削除イベント
if (labelList) {
    labelList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-label-btn')) {
            const labelId = e.target.dataset.id;
            if (confirm('このラベルを削除しますか？')) {
                deleteLabel(labelId);
            }
        }
    });
}

// =============================
// カウンター管理機能
// =============================

// localStorageからデータを取得
function loadCounters() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            counters = JSON.parse(data);
        } catch (e) {
            counters = [];
        }
    } else {
        counters = [];
    }
}

// localStorageへ保存
function saveCounters() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
}

// ラベルデータの保存・読み込み
function saveLabels() {
    localStorage.setItem('counterAppLabels', JSON.stringify(labels));
}

function loadLabels() {
    const data = localStorage.getItem('counterAppLabels');
    if (data) {
        try {
            labels = JSON.parse(data);
        } catch (e) {
            labels = [];
        }
    } else {
        labels = [];
    }
}

// カウンターリストを描画
function renderCounters() {
    counterListEl.innerHTML = '';
    if (counters.length === 0) {
        counterListEl.innerHTML = `
        <div class="text-center py-12 text-slate-500">
            <p>カウンターがありません。</p>
            <p class="text-sm">下のフォームから新しいカウンターを追加してください。</p>
        </div>`;
        return;
    }
    
    counters.forEach(counter => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow p-6 transition-all';
        
        // カウンターのラベル表示
        const counterLabels = counter.labels ? counter.labels.map(labelId => {
            const label = labels.find(l => l.id === labelId);
            return label ? `<span class="inline-block px-2 py-1 text-xs rounded mr-1" style="background-color: ${label.color}20; color: ${label.color};">${label.name}</span>` : '';
        }).join('') : '';
        
        let countDisplay = '';
        if (editCountId === counter.id) {
            countDisplay = `<input type="number" value="${counter.count}" data-id="${counter.id}" class="counter-count-input text-3xl font-bold w-24 text-center border border-blue-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all" />
            <button class="save-count-btn bg-green-500 hover:bg-green-600 text-white rounded px-3 py-2 ml-2 transition-all" data-id="${counter.id}">保存</button>
            <button class="cancel-count-btn bg-slate-300 hover:bg-slate-400 text-slate-700 rounded px-3 py-2 ml-1 transition-all" data-id="${counter.id}">キャンセル</button>`;
        } else {
            countDisplay = `<span class="text-3xl font-bold w-24 text-center">${counter.count}</span>
            <button class="edit-count-btn bg-slate-200 hover:bg-slate-300 text-slate-700 rounded px-3 py-2 ml-2 transition-all" data-id="${counter.id}">編集</button>`;
        }
        
        card.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                        <input type="text" value="${counter.name}" data-id="${counter.id}" class="counter-name text-xl font-bold px-2 py-1 rounded border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all bg-slate-50" />
                    </div>
                    ${counter.description ? `<p class="text-slate-600 mb-2">${counter.description}</p>` : ''}
                    <div class="flex items-center gap-2 mb-2">
                        <div class="counter-labels flex flex-wrap gap-1" data-id="${counter.id}">
                            ${counterLabels}
                        </div>
                        <button class="edit-labels-btn bg-slate-200 hover:bg-slate-300 text-slate-700 rounded px-2 py-1 text-sm transition-all" data-id="${counter.id}">ラベル編集</button>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${countDisplay}
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <button class="inc-btn bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2 transition-all" data-id="${counter.id}">+1</button>
                    <button class="dec-btn bg-slate-400 hover:bg-slate-500 text-white rounded px-4 py-2 transition-all" data-id="${counter.id}">-1</button>
                    <button class="reset-btn bg-yellow-400 hover:bg-yellow-500 text-white rounded px-4 py-2 transition-all" data-id="${counter.id}">リセット</button>
                </div>
                <button class="del-btn bg-red-500 hover:bg-red-600 text-white rounded px-4 py-2 transition-all" data-id="${counter.id}">削除</button>
            </div>
        `;
        counterListEl.appendChild(card);
    });
}

// カウンター追加
addForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = newCounterNameInput.value.trim();
    if (!name) return;
    
    // 詳細情報を取得
    const description = document.getElementById('new-counter-description')?.value || '';
    
    // 選択されたラベルを取得
    const selectedLabels = Array.from(document.querySelectorAll('.label-checkbox:checked')).map(cb => cb.value);
    
    const counterData = {
        name,
        description,
        labels: selectedLabels,
        count: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (window.firebaseService && currentUser) {
        const result = await window.firebaseService.createCounter(counterData);
        if (result.success) {
            newCounterNameInput.value = '';
            resetCounterForm();
            showMessage('カウンターを追加しました');
        } else {
            showMessage(result.error, true);
        }
    } else {
        // ローカルモード
        const id = Date.now().toString() + Math.random().toString(36).slice(2);
        counterData.id = id;
        counters.push(counterData);
        saveCounters();
        renderCounters();
        newCounterNameInput.value = '';
        resetCounterForm();
    }
});

// カウンターフォームをリセット
function resetCounterForm() {
    if (document.getElementById('new-counter-description')) {
        document.getElementById('new-counter-description').value = '';
    }
    
    // ラベルチェックボックスをクリア
    document.querySelectorAll('.label-checkbox').forEach(cb => cb.checked = false);
    
    // 詳細設定を折りたたむ
    if (isDetailsExpanded) {
        toggleDetails();
    }
}

// 詳細設定の展開/折りたたみ
const toggleDetailsBtn = document.getElementById('toggle-details-btn');
const counterDetails = document.getElementById('counter-details');

function toggleDetails() {
    isDetailsExpanded = !isDetailsExpanded;
    if (counterDetails) {
        counterDetails.style.display = isDetailsExpanded ? 'block' : 'none';
    }
    if (toggleDetailsBtn) {
        toggleDetailsBtn.textContent = isDetailsExpanded ? '詳細設定を隠す' : '詳細設定を表示';
    }
}

if (toggleDetailsBtn) {
    toggleDetailsBtn.addEventListener('click', toggleDetails);
}

// カウンター操作（イベントデリゲーション）
counterListEl.addEventListener('click', async function(e) {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return;
    
    const counter = counters.find(c => c.id === id);
    if (!counter) return;
    
    if (target.classList.contains('inc-btn')) {
        counter.count++;
        counter.updatedAt = new Date().toISOString();
    } else if (target.classList.contains('dec-btn')) {
        counter.count--;
        counter.updatedAt = new Date().toISOString();
    } else if (target.classList.contains('reset-btn')) {
        counter.count = 0;
        counter.updatedAt = new Date().toISOString();
    } else if (target.classList.contains('del-btn')) {
        if (confirm('このカウンターを削除しますか？')) {
            if (window.firebaseService && currentUser) {
                const result = await window.firebaseService.deleteCounter(id);
                if (result.success) {
                    showMessage('カウンターを削除しました');
                } else {
                    showMessage(result.error, true);
                }
            } else {
                counters = counters.filter(c => c.id !== id);
                saveCounters();
                renderCounters();
            }
        }
        return;
    } else if (target.classList.contains('edit-count-btn')) {
        editCountId = id;
        renderCounters();
        setTimeout(() => {
            const input = document.querySelector('.counter-count-input[data-id="' + id + '"]');
            if (input) input.focus();
        }, 0);
        return;
    } else if (target.classList.contains('save-count-btn')) {
        const input = document.querySelector('.counter-count-input[data-id="' + id + '"]');
        if (input) {
            let val = parseInt(input.value, 10);
            if (isNaN(val)) val = 0;
            counter.count = val;
            counter.updatedAt = new Date().toISOString();
        }
        editCountId = null;
    } else if (target.classList.contains('cancel-count-btn')) {
        editCountId = null;
    } else if (target.classList.contains('edit-labels-btn')) {
        showLabelEditor(id);
        return;
    } else {
        return;
    }
    
    if (window.firebaseService && currentUser) {
        const result = await window.firebaseService.updateCounter(id, {
            count: counter.count,
            updatedAt: counter.updatedAt
        });
        if (!result.success) {
            showMessage(result.error, true);
        }
    } else {
        saveCounters();
        renderCounters();
    }
});

// カウンター名編集
counterListEl.addEventListener('change', async function(e) {
    if (e.target.classList.contains('counter-name')) {
        const id = e.target.dataset.id;
        const counter = counters.find(c => c.id === id);
        if (counter) {
            counter.name = e.target.value;
            counter.updatedAt = new Date().toISOString();
            
            if (window.firebaseService && currentUser) {
                const result = await window.firebaseService.updateCounter(id, {
                    name: counter.name,
                    updatedAt: counter.updatedAt
                });
                if (!result.success) {
                    showMessage(result.error, true);
                }
            } else {
                saveCounters();
                renderCounters();
            }
        }
    }
});

// =============================
// Firebase統合機能
// =============================

// カウンターデータ更新ハンドラー
function handleCounterUpdate(result) {
    if (result.success) {
        counters = result.data || [];
        renderCounters();
    } else {
        console.error('カウンターデータの取得に失敗:', result.error);
    }
}

// ラベルデータ更新ハンドラー
function handleLabelUpdate(result) {
    if (result.success) {
        labels = result.data || [];
        renderLabels();
    } else {
        console.error('ラベルデータの取得に失敗:', result.error);
    }
}

// グローバル関数として公開（Firebase統合スクリプトから呼び出される）
window.updateCounterList = handleCounterUpdate;
window.updateLabelList = handleLabelUpdate;

// =============================
// 既存の同期・ファイル機能（簡略化）
// =============================

// メッセージ表示関数
function showMessage(message, isError = false) {
    // 簡易的なメッセージ表示
    const messageEl = document.createElement('div');
    messageEl.className = `fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${isError ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`;
    messageEl.textContent = message;
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        document.body.removeChild(messageEl);
    }, 3000);
}

// 既存の同期・ファイル機能のUI制御
const syncButton = document.getElementById('sync-button');
const syncSection = document.getElementById('sync-section');
const fileButton = document.getElementById('file-button');
const fileSection = document.getElementById('file-section');

if (syncButton && syncSection) {
    syncButton.addEventListener('click', () => {
        if (syncSection.style.display === 'none' || syncSection.style.display === '') {
            syncSection.style.display = 'block';
            syncSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            syncSection.style.display = 'none';
        }
    });
}

if (fileButton && fileSection) {
    fileButton.addEventListener('click', () => {
        if (fileSection.style.display === 'none' || fileSection.style.display === '') {
            fileSection.style.display = 'block';
            fileSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            fileSection.style.display = 'none';
        }
    });
}

// =============================
// 初期化
// =============================

// 初期データ読み込み
loadCounters();
loadLabels();
renderCounters();
renderLabels();

// Firebase認証状態の監視を開始
if (window.firebaseService) {
    window.firebaseService.onAuthStateChanged(updateAuthUI);
}

// ラベル編集ダイアログを表示
function showLabelEditor(counterId) {
    const counter = counters.find(c => c.id === counterId);
    if (!counter) return;
    
    // モーダルダイアログを作成
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-bold mb-4">ラベルを編集: ${counter.name}</h3>
            <div class="space-y-3">
                <div class="label-checkboxes">
                    ${labels.map(label => `
                        <label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                            <input type="checkbox" value="${label.id}" class="label-checkbox-edit" 
                                ${counter.labels && counter.labels.includes(label.id) ? 'checked' : ''}>
                            <div class="w-4 h-4 rounded" style="background-color: ${label.color}"></div>
                            <span>${label.name}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="flex gap-2 mt-6">
                <button class="save-labels-btn bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2 transition-all">保存</button>
                <button class="cancel-labels-btn bg-slate-300 hover:bg-slate-400 text-slate-700 rounded px-4 py-2 transition-all">キャンセル</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // イベントリスナーを追加
    const saveBtn = modal.querySelector('.save-labels-btn');
    const cancelBtn = modal.querySelector('.cancel-labels-btn');
    
    saveBtn.addEventListener('click', async () => {
        const selectedLabels = Array.from(modal.querySelectorAll('.label-checkbox-edit:checked')).map(cb => cb.value);
        counter.labels = selectedLabels;
        counter.updatedAt = new Date().toISOString();
        
        if (window.firebaseService && currentUser) {
            const result = await window.firebaseService.updateCounter(counterId, {
                labels: counter.labels,
                updatedAt: counter.updatedAt
            });
            if (result.success) {
                showMessage('ラベルを更新しました');
            } else {
                showMessage(result.error, true);
            }
        } else {
            saveCounters();
            renderCounters();
        }
        
        document.body.removeChild(modal);
    });
    
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // 背景クリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

