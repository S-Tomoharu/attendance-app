import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, update, remove } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyDoGXkV8qcg0leHZ3SpKekikJ8JaQW70s4",
    authDomain: "attendance-app-f9a60.firebaseapp.com",
    databaseURL: "https://attendance-app-f9a60-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "attendance-app-f9a60",
    storageBucket: "attendance-app-f9a60.firebasestorage.app",
    messagingSenderId: "940337246680",
    appId: "1:940337246680:web:4c98fea6ef9d1528713b04"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// DOM要素
const loading = document.getElementById('loading');
const usersGrid = document.getElementById('users-grid');
const empty = document.getElementById('empty');

// ページ読み込み時
window.addEventListener('DOMContentLoaded', () => {
    // 初期状態：ローディング表示
    loading.style.display = 'block';
    usersGrid.style.display = 'none';
    empty.style.display = 'none';

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // ログイン済み
            loadAllUsers();
        } else {
            // 未ログイン → ログイン画面へ
            window.location.href = 'admin-login.html';
        }
    });
});

// 全ユーザーを読み込み
async function loadAllUsers() {
    try {
//        loading.style.display = 'block';
//        usersGrid.style.display = 'none';
//        empty.style.display = 'none';

        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);

        if (!snapshot.exists()) {
            loading.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        const users = snapshot.val();
        const userArray = Object.entries(users)
            .filter(([userId, user]) => userId !== 'null' && user.name)
            .map(([userId, user]) => ({ userId, ...user }));

        if (userArray.length === 0) {
            loading.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        displayUsers(userArray);
        loading.style.display = 'none';
        usersGrid.style.display = 'grid';

    } catch (error) {
        console.error('Error loading users:', error);
        loading.textContent = 'エラーが発生しました';
    }
}

// ユーザーカードを表示
function displayUsers(users) {
    usersGrid.innerHTML = '';

    users.forEach(user => {
        const card = createUserCard(user);
        usersGrid.appendChild(card);
    });
}

// ユーザーカードを作成
// ユーザーカードを作成
function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';

    const reminderEnabled = user.reminderEnabled || false;
    const badgeClass = reminderEnabled ? 'reminder-on' : 'reminder-off';
    const badgeText = reminderEnabled ? 'ON' : 'OFF';

    // 最終出勤日を取得
    const lastCheckin = getLastCheckin(user.records);

    card.innerHTML = `
        <div class="user-header">
            <div>
                <div class="user-name">${escapeHtml(user.name || '名前未設定')}</div>
                <div class="user-id">${user.userId}</div>
            </div>
            <div class="reminder-badge ${badgeClass}">${badgeText}</div>
        </div>
        <div class="user-info">
            <div class="info-row">
                <span class="info-label">メールアドレス</span>
                <span class="info-value">${escapeHtml(user.email || '未設定')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">出勤時刻</span>
                <span class="info-value">${user.remindCheckinTime || '未設定'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">退勤時刻</span>
                <span class="info-value">${user.remindCheckoutTime || '未設定'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">最終出勤日</span>
                <span class="info-value">${lastCheckin || 'なし'}</span>
            </div>
        </div>
        <div class="user-actions">
            <button class="action-btn toggle-btn" data-userid="${user.userId}" data-enabled="${reminderEnabled}">
                ${reminderEnabled ? '🔕 リマインダーOFF' : '🔔 リマインダーON'}
            </button>
            <button class="action-btn delete-btn" data-userid="${user.userId}" data-username="${escapeHtml(user.name)}">
                🗑️ ユーザー削除
            </button>
        </div>
    `;

    // イベントリスナーを追加
    const toggleBtn = card.querySelector('.toggle-btn');
    const deleteBtn = card.querySelector('.delete-btn');

    toggleBtn.addEventListener('click', () => toggleReminder(user.userId, !reminderEnabled));
    deleteBtn.addEventListener('click', () => deleteUser(user.userId, user.name));

    return card;
}



// 最終出勤日を取得
function getLastCheckin(records) {
    if (!records) return null;

    const dates = [];
    Object.values(records).forEach(monthData => {
        Object.entries(monthData).forEach(([date, record]) => {
            if (record.checkin) {
                dates.push(date);
            }
        });
    });

    if (dates.length === 0) return null;

    dates.sort((a, b) => b.localeCompare(a));
    return dates[0];
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// リマインダーON/OFF切り替え
async function toggleReminder(userId, enabled) {
    try {
        // ONにする場合、設定があるか確認
        if (enabled) {
            const userRef = ref(database, `users/${userId}`);
            const snapshot = await get(userRef);
            const user = snapshot.val();
            
            if (!user.remindCheckinTime || !user.remindCheckoutTime || !user.email) {
                alert('リマインダーをONにするには、メールアドレスと時刻を設定してください');
                return;
            }
        }
        
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, {
            reminderEnabled: enabled
        });

        alert(`リマインダーを${enabled ? 'ON' : 'OFF'}にしました`);
        await loadAllUsers(); // 再読み込み

    } catch (error) {
        console.error('Error toggling reminder:', error);
        alert('エラーが発生しました');
    }
}

// ユーザー削除
async function deleteUser(userId, userName) {
    const confirmed = confirm(`本当に「${userName}」を削除しますか？\n\nこの操作は取り消せません。`);
    
    if (!confirmed) return;

    try {
        const userRef = ref(database, `users/${userId}`);
        await remove(userRef);

        alert(`「${userName}」を削除しました`);
        await loadAllUsers(); // 再読み込み

    } catch (error) {
        console.error('Error deleting user:', error);
        alert('削除に失敗しました');
    }
}

// ログアウト
async function logout() {
    try {
        await signOut(auth);
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// グローバルに公開（HTML から呼べるように）
window.logout = logout;

