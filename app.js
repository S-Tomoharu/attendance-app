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

// URLパラメータをチェック
const params = new URLSearchParams(window.location.search);
const action = params.get('action');
const urlUserId = params.get('userId');

// ログインチェック（URLパラメータがある場合はスキップ）
let userId = localStorage.getItem('userId');
let userName = localStorage.getItem('userName');

if (!action && (!userId || !userName)) {
    window.location.href = 'login.html';
}

// ユーザー名を表示
if (userName) {
    document.getElementById('user-name').textContent = `${userName} さん`;
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
    return now.toISOString().split('T')[0];
}

// 現在時刻取得
function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
}

// 出勤記録
document.getElementById('checkin-btn').addEventListener('click', async () => {
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

// URLパラメータでの自動記録処理
if (action && urlUserId) {
    get(ref(database, `users/${urlUserId}`)).then(snapshot => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            localStorage.setItem('userId', urlUserId);
            localStorage.setItem('userName', userData.name);
            
            document.getElementById('user-name').textContent = `${userData.name} さん`;
            
            const today = getTodayDate();
            const time = getCurrentTime();
            
            if (action === 'checkin') {
                set(ref(database, `users/${urlUserId}/records/${today}/checkin`), time)
                    .then(() => {
                        document.getElementById('completion-message').textContent = '出勤記録完了';
                        document.getElementById('completion-time').textContent = time;
                        document.getElementById('completion-overlay').style.display = 'flex';
                        
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    })
                    .catch(error => {
                        showMessage('エラーが発生しました', 'error');
                        console.error(error);
                    });
            } else if (action === 'checkout') {
                set(ref(database, `users/${urlUserId}/records/${today}/checkout`), time)
                    .then(() => {
                        document.getElementById('completion-message').textContent = '退勤記録完了';
                        document.getElementById('completion-time').textContent = time;
                        document.getElementById('completion-overlay').style.display = 'flex';
                        
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    })
                    .catch(error => {
                        showMessage('エラーが発生しました', 'error');
                        console.error(error);
                    });
            }
        } else {
            showMessage('ユーザーが見つかりません', 'error');
        }
    }).catch(error => {
        console.error(error);
        showMessage('エラーが発生しました', 'error');
    });
} else if (userId && userName) {
    document.getElementById('user-name').textContent = `${userName} さん`;
    loadTodayStatus();
}

// Service Worker登録（PWA対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/attendance-app/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}
