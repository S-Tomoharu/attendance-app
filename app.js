// Firebase設定
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

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

// カスタム確認ダイアログ
function customConfirm(message) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirm-dialog');
        const messageEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');
        
        messageEl.textContent = message;
        dialog.style.display = 'flex';
        
        const handleOk = () => {
            dialog.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };
        
        const handleCancel = () => {
            dialog.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

// 今日の日付取得
function getTodayDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// 現在時刻取得
function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
}

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

// 今日の記録を読み込み
async function loadTodayStatus() {
    const userId = localStorage.getItem('userId');
    const today = getTodayDate();
    const yearMonth = today.substring(0, 7); // "2026-01"
    
    try {
        const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}/${today}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const checkin = data.checkin || '未記録';
            const checkout = data.checkout || '未記録';
            document.getElementById('today-status').innerHTML = 
                `<strong>今日の記録</strong><br>出勤　${checkin}<br>退勤　${checkout}`;
        } else {
            document.getElementById('today-status').innerHTML = '<strong>今日の記録</strong><br>未記録';
        }
    } catch (error) {
        console.error(error);
    }
}



// 出勤記録関数


async function recordCheckin() {
    const userId = localStorage.getItem('userId');
    const today = getTodayDate();
    const yearMonth = today.substring(0, 7); // "2026-01"
    const time = getCurrentTime();
    
    try {
        const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}/${today}/checkin`));
        
        if (snapshot.exists()) {
            const existingTime = snapshot.val();
            const confirmOverwrite = await customConfirm(`既に出勤記録があります（${existingTime}）\n上書きしますか？`);
            
            if (!confirmOverwrite) {
                showMessage('出勤記録をキャンセルしました', 'info');
                return;
            }
        }
        
        await set(ref(database, `users/${userId}/records/${yearMonth}/${today}/checkin`), time);
        showMessage(`出勤記録: ${time}`, 'success');
        loadTodayStatus();
    } catch (error) {
        showMessage('エラーが発生しました', 'error');
        console.error(error);
    }
}




// 退勤記録関数
async function recordCheckout() {
    const userId = localStorage.getItem('userId');
    const today = getTodayDate();
    const yearMonth = today.substring(0, 7); // "2026-01"
    const time = getCurrentTime();
    
    try {
        const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}/${today}/checkout`));
        
        if (snapshot.exists()) {
            const existingTime = snapshot.val();
            const confirmOverwrite = await customConfirm(`既に退勤記録があります（${existingTime}）\n上書きしますか？`);
            
            if (!confirmOverwrite) {
                showMessage('退勤記録をキャンセルしました', 'info');
                return;
            }
        }
        
        await set(ref(database, `users/${userId}/records/${yearMonth}/${today}/checkout`), time);
        showMessage(`退勤記録: ${time}`, 'success');
        loadTodayStatus();
    } catch (error) {
        showMessage('エラーが発生しました', 'error');
        console.error(error);
    }
}



// URLパラメータをチェック
const params = new URLSearchParams(window.location.search);
const action = params.get('action');

// ログインチェック
let userId = localStorage.getItem('userId');
let userName = localStorage.getItem('userName');

if (userId && userName) {
    // ログイン済み
    document.getElementById('user-name').textContent = `${userName} さん`;
    
    // actionがあれば即座に実行
    if (action === 'checkin') {
        recordCheckin();
    } else if (action === 'checkout') {
        recordCheckout();
    }
} else {
    // ログインしていない場合はログイン画面へ
    window.location.href = 'login.html';
}

// ログアウト
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    window.location.href = 'login.html';
});

// 現在時刻を表示
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ja-JP');
    document.getElementById('current-time').textContent = timeString;
}

setInterval(updateTime, 1000);
updateTime();

// 出勤ボタン
document.getElementById('checkin-btn').addEventListener('click', recordCheckin);

// 退勤ボタン
document.getElementById('checkout-btn').addEventListener('click', recordCheckout);

// ページ読み込み時に今日の記録を表示
loadTodayStatus();
