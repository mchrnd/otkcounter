// --- カウンターアプリ本体 ---
const STORAGE_KEY = 'counterAppData';
const counterListEl = document.getElementById('counter-list');
const addForm = document.getElementById('add-counter-form');
const newCounterNameInput = document.getElementById('new-counter-name');

// データ構造: [{id, label, count}]
let counters = [];

// --- 直接編集モード用の状態 ---
let editCountId = null;

// --- Firebase同期状態 ---
let isSyncEnabled = false;
let syncListener = null;

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
        card.className = 'flex items-center justify-between bg-white rounded-lg shadow p-4 transition-all';
        let countDisplay = '';
        if (editCountId === counter.id) {
            countDisplay = `<input type="number" value="${counter.count}" data-id="${counter.id}" class="counter-count-input text-2xl font-bold w-20 text-center border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all" />
            <button class="save-count-btn bg-green-500 hover:bg-green-600 text-white rounded px-2 py-1 ml-2 transition-all" data-id="${counter.id}">保存</button>
            <button class="cancel-count-btn bg-slate-300 hover:bg-slate-400 text-slate-700 rounded px-2 py-1 ml-1 transition-all" data-id="${counter.id}">キャンセル</button>`;
        } else {
            countDisplay = `<span class="text-2xl font-bold w-16 text-center">${counter.count}</span>
            <button class="edit-count-btn bg-slate-200 hover:bg-slate-300 text-slate-700 rounded px-2 py-1 ml-2 transition-all" data-id="${counter.id}">編集</button>`;
        }
        card.innerHTML = `
            <div class="flex items-center gap-4 flex-grow">
                <input type="text" value="${counter.label}" data-id="${counter.id}" class="counter-label px-2 py-1 rounded border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all w-32 sm:w-48 bg-slate-50 text-slate-800 font-medium" />
                ${countDisplay}
            </div>
            <div class="flex items-center gap-2">
                <button class="inc-btn bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1 transition-all" data-id="${counter.id}">+1</button>
                <button class="dec-btn bg-slate-400 hover:bg-slate-500 text-white rounded px-3 py-1 transition-all" data-id="${counter.id}">-1</button>
                <button class="reset-btn bg-yellow-400 hover:bg-yellow-500 text-white rounded px-3 py-1 transition-all" data-id="${counter.id}">リセット</button>
                <button class="del-btn bg-red-500 hover:bg-red-600 text-white rounded px-3 py-1 transition-all" data-id="${counter.id}">削除</button>
            </div>
        `;
        counterListEl.appendChild(card);
    });
}

// カウンター追加
addForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const label = newCounterNameInput.value.trim();
    if (!label) return;
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    counters.push({ id, label, count: 0 });
    saveCounters();
    if (isSyncEnabled) {
        syncToFirebase();
    }
    renderCounters();
    newCounterNameInput.value = '';
});

// カウンター操作（イベントデリゲーション）
counterListEl.addEventListener('click', function(e) {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return;
    const idx = counters.findIndex(c => c.id === id);
    if (idx === -1) return;
    if (target.classList.contains('inc-btn')) {
        counters[idx].count++;
    } else if (target.classList.contains('dec-btn')) {
        counters[idx].count--;
    } else if (target.classList.contains('reset-btn')) {
        counters[idx].count = 0;
    } else if (target.classList.contains('del-btn')) {
        counters.splice(idx, 1);
    } else if (target.classList.contains('edit-count-btn')) {
        editCountId = id;
        renderCounters();
        // inputにフォーカス
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
            counters[idx].count = val;
        }
        editCountId = null;
    } else if (target.classList.contains('cancel-count-btn')) {
        editCountId = null;
    } else {
        return;
    }
    saveCounters();
    if (isSyncEnabled) {
        syncToFirebase();
    }
    renderCounters();
});

// ラベル編集
counterListEl.addEventListener('change', function(e) {
    if (e.target.classList.contains('counter-label')) {
        const id = e.target.dataset.id;
        const idx = counters.findIndex(c => c.id === id);
        if (idx !== -1) {
            counters[idx].label = e.target.value;
            saveCounters();
            if (isSyncEnabled) {
                syncToFirebase();
            }
            renderCounters();
        }
    }
});

// =============================
// Firebase Realtime Database 同期機能
// =============================

const syncEnableBtn = document.getElementById('sync-enable-btn');
const syncDisableBtn = document.getElementById('sync-disable-btn');
const syncResetBtn = document.getElementById('sync-reset-btn');
const syncStatus = document.getElementById('sync-status');
const syncMessage = document.getElementById('sync-message');
const syncVersionInfo = document.getElementById('sync-version-info');

function setSyncStatus(msg, isError = false) {
    if (syncMessage) {
        syncMessage.textContent = msg;
        syncMessage.style.color = isError ? 'red' : 'green';
    }
}

// Firebaseにデータを同期
async function syncToFirebase() {
    if (!window.firebaseDB || !window.firebaseRef || !window.firebaseSet) {
        console.error('Firebase SDK not loaded');
        return;
    }

    try {
        const data = {
            counters: counters,
            lastUpdated: new Date().toISOString(),
            deviceId: getDeviceId()
        };
        
        await window.firebaseSet(window.firebaseRef(window.firebaseDB, 'counters'), data);
        setSyncStatus('データを同期しました');
        if (syncVersionInfo) {
            syncVersionInfo.textContent = `最終同期: ${new Date().toLocaleString()}`;
        }
    } catch (error) {
        console.error('Firebase sync error:', error);
        setSyncStatus('同期に失敗しました: ' + error.message, true);
    }
}

// Firebaseからデータを取得
async function loadFromFirebase() {
    if (!window.firebaseDB || !window.firebaseRef || !window.firebaseOnValue) {
        console.error('Firebase SDK not loaded');
        return;
    }

    try {
        const countersRef = window.firebaseRef(window.firebaseDB, 'counters');
        
        // リアルタイムリスナーを設定
        syncListener = window.firebaseOnValue(countersRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.counters) {
                // 他のデバイスからの更新を反映
                counters = data.counters;
                saveCounters();
                renderCounters();
                
                if (data.lastUpdated) {
                    const updateTime = new Date(data.lastUpdated);
                    syncVersionInfo.textContent = `最終更新: ${updateTime.toLocaleString()}`;
                }
                
                setSyncStatus('データを同期しました');
            }
        });
        
        setSyncStatus('リアルタイム同期を開始しました');
        syncStatus.textContent = '接続中';
        syncStatus.style.color = 'green';
        
    } catch (error) {
        console.error('Firebase load error:', error);
        setSyncStatus('同期の開始に失敗しました: ' + error.message, true);
    }
}

// デバイスIDを生成（簡易版）
function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// 同期を有効化
if (syncEnableBtn) {
    syncEnableBtn.addEventListener('click', async () => {
        isSyncEnabled = true;
        syncEnableBtn.style.display = 'none';
        syncDisableBtn.style.display = 'inline-block';
        
        await loadFromFirebase();
    });
}

// 同期を無効化
if (syncDisableBtn) {
    syncDisableBtn.addEventListener('click', () => {
        isSyncEnabled = false;
        syncEnableBtn.style.display = 'inline-block';
        syncDisableBtn.style.display = 'none';
        
        if (syncListener && window.firebaseOff) {
            window.firebaseOff(syncListener);
            syncListener = null;
        }
        
        syncStatus.textContent = '未接続';
        syncStatus.style.color = 'gray';
        setSyncStatus('同期を無効化しました');
    });
}

// データリセット
if (syncResetBtn) {
    syncResetBtn.addEventListener('click', async () => {
        if (confirm('すべてのデータをリセットしますか？この操作は取り消せません。')) {
            counters = [];
            saveCounters();
            renderCounters();
            
            if (isSyncEnabled) {
                await syncToFirebase();
            }
            
            setSyncStatus('データをリセットしました');
        }
    });
}

// =============================
// ローカルファイル保存機能
// =============================

const fileSaveBtn = document.getElementById('file-save-btn');
const fileLoadBtn = document.getElementById('file-load-btn');
const fileInput = document.getElementById('file-input');
const fileMessage = document.getElementById('file-message');
const fileVersionInfo = document.getElementById('file-version-info');

function setFileStatus(msg, isError = false) {
    if (fileMessage) {
        fileMessage.textContent = msg;
        fileMessage.style.color = isError ? 'red' : 'green';
    }
}

// ファイル保存機能
if (fileSaveBtn) {
    fileSaveBtn.addEventListener('click', () => {
        try {
            const data = {
                counters: counters,
                version: '1.0',
                timestamp: new Date().toISOString(),
                app: 'Counter App'
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `counter_data_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setFileStatus('ファイルを保存しました');
            if (fileVersionInfo) {
                fileVersionInfo.textContent = `最終保存: ${new Date().toLocaleString()}`;
            }
        } catch (e) {
            setFileStatus('保存に失敗しました: ' + e.message, true);
        }
    });
}

// ファイル読み込み機能
if (fileLoadBtn) {
    fileLoadBtn.addEventListener('click', () => {
        if (fileInput) {
            fileInput.click();
        }
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // データ形式の検証
                if (!data.counters || !Array.isArray(data.counters)) {
                    throw new Error('無効なファイル形式です');
                }
                
                // カウンターデータの検証
                const validCounters = data.counters.filter(counter => 
                    counter && typeof counter.id === 'string' && 
                    typeof counter.label === 'string' && 
                    typeof counter.count === 'number'
                );
                
                if (validCounters.length === 0) {
                    throw new Error('有効なカウンターデータが見つかりません');
                }
                
                // データを適用
                counters = validCounters;
                saveCounters();
                if (isSyncEnabled) {
                    syncToFirebase();
                }
                renderCounters();
                
                setFileStatus('ファイルを読み込みました');
                if (fileVersionInfo && data.timestamp) {
                    const loadDate = new Date(data.timestamp);
                    fileVersionInfo.textContent = `読み込み元: ${loadDate.toLocaleString()}`;
                }
                
            } catch (e) {
                setFileStatus('ファイルの読み込みに失敗しました: ' + e.message, true);
            }
        };
        reader.readAsText(file);
    });
}

// 初期化
loadCounters();
renderCounters();

// ヘッダーの同期ボタンで同期画面を表示
const headerSyncBtn = document.getElementById('sync-button');
const syncSection = document.getElementById('sync-section');
if (headerSyncBtn && syncSection) {
    headerSyncBtn.addEventListener('click', () => {
        if (syncSection.style.display === 'none' || syncSection.style.display === '') {
            syncSection.style.display = 'block';
            syncSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            syncSection.style.display = 'none';
        }
    });
}

// ヘッダーのファイルボタンでファイル保存画面を表示
const headerFileBtn = document.getElementById('file-button');
const fileSection = document.getElementById('file-section');
if (headerFileBtn && fileSection) {
    headerFileBtn.addEventListener('click', () => {
        if (fileSection.style.display === 'none' || fileSection.style.display === '') {
            fileSection.style.display = 'block';
            fileSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            fileSection.style.display = 'none';
        }
    });
}

