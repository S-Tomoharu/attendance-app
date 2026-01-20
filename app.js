// Firebase設定（後で設定します）
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Firebase設定情報（次のステップで追加）
// Firebase設定情報
const firebaseConfig = {
    apiKey: "AIzaSyDoGXkV8qcg0leHZ3SpKekikJ8JaQW70s4",
    authDomain: "attendance-app-f9a60.firebaseapp.com",
    databaseURL: "https://attendance-app-f9a60-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "attendance-app-f9a60",
    storageBucket: "attendance-app-f9a60.firebasestorage.app",
    messagingSenderId: "940337246680",
    appId: "1:940337246680:web:c075eeca6e436db0e702ad"
};


// Firebase初期化
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 現在時刻を表示
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ja-JP');
    document.getElementById('current-time').textContent = timeString;
}

setInterval(updateTime, 1000);
updateTime();

// メッセージ表示
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }, 3000);
}

// 今日の日付取得
function getTodayDate() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD形式
}

// 現在時刻取得
function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0]; // HH:MM:SS形式
}

// 出勤記録
document.getElementById('checkin-btn').addEventListener('click', async () => {
    const userId = 'user001'; // 仮のユーザーID（Phase 3で認証機能追加）
    const today = getTodayDate();
    const time = getCurrentTime();
    
    try {
        await set(ref(database, `users/${userId}/records/${today}/checkin`), time);
        showMessage(`出勤記録: ${time}`, 'success');
        loadTodayStatus();
    } catch (error) {
        showMessage('エラーが発生しました', 'error');
        console.error(error);
    }
});

// 退勤記録
document.getElementById('checkout-btn').addEventListener('click', async () => {
    const userId = 'user001'; // 仮のユーザーID
    const today = getTodayDate();
    const time = getCurrentTime();
    
    try {
        await set(ref(database, `users/${userId}/records/${today}/checkout`), time);
        showMessage(`退勤記録: ${time}`, 'success');
        loadTodayStatus();
    } catch (error) {
        showMessage('エラーが発生しました', 'error');
        console.error(error);
    }
});

// 今日の記録を読み込み
async function loadTodayStatus() {
    const userId = 'user001';
    const today = getTodayDate();
    
    try {
        const snapshot = await get(ref(database, `users/${userId}/records/${today}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const checkin = data.checkin || '未記録';
            const checkout = data.checkout || '未記録';
            document.getElementById('today-status').textContent = 
                `今日の記録: 出勤 ${checkin} / 退勤 ${checkout}`;
        } else {
            document.getElementById('today-status').textContent = '今日の記録: 未記録';
        }
    } catch (error) {
        console.error(error);
    }
}

// ページ読み込み時に今日の記録を表示
loadTodayStatus();
