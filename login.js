// Firebase設定
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

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

// ログインフォーム送信
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const pin = document.getElementById('pin').value;
    
    if (!name || !pin) {
        showMessage('名前とPINを入力してください', 'error');
        return;
    }
    
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        showMessage('PINは4桁の数字で入力してください', 'error');
        return;
    }
    
    try {
        // 全ユーザーを取得
        const usersSnapshot = await get(ref(database, 'users'));
        
        if (!usersSnapshot.exists()) {
            showMessage('ユーザーが見つかりません', 'error');
            return;
        }
        
        const users = usersSnapshot.val();
        let foundUser = null;
        
        // 名前とPINが一致するユーザーを探す
        for (const [userId, userData] of Object.entries(users)) {
            if (userData.name === name && userData.pin === pin) {
                foundUser = { id: userId, ...userData };
                break;
            }
        }
        
        if (foundUser) {
            // ログイン成功
            localStorage.setItem('userId', foundUser.id);
            localStorage.setItem('userName', foundUser.name);
            showMessage('ログイン成功！', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showMessage('名前またはPINが間違っています', 'error');
        }
    } catch (error) {
        console.error(error);
        showMessage('エラーが発生しました', 'error');
    }
});
