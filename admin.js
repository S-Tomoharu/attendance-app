import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyBSsPI41НННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННННeyXKWWc",
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

// DOM要素
const loading = document.getElementById('loading');
const usersGrid = document.getElementById('users-grid');
const empty = document.getElementById('empty');

// ページ読み込み時
window.addEventListener('DOMContentLoaded', async () => {
    await loadAllUsers();
});

// 全ユーザーを読み込み
async function loadAllUsers() {
    try {
        loading.style.display = 'block';
        usersGrid.style.display = 'none';
        empty.style.display = 'none';

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
    `;

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
