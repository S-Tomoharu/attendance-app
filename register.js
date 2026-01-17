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

// ユーザーIDを生成
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 登録フォーム送信
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const pin = document.getElementById('pin').value;
    const pinConfirm = document.getElementById('pin-confirm').value;
    
    // バリデーション
    if (!name || !pin || !pinConfirm) {
        showMessage('全ての項目を入力してください', 'error');
        return;
    }
    
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        showMessage('PINは4桁の数字で入力してください', 'error');
        return;
    }
    
    if (pin !== pinConfirm) {
        showMessage('PINが一致しません', 'error');
        return;
    }
    
    try {
        // 同じ名前のユーザーが既に存在するかチェック
        const usersSnapshot = await get(ref(database, 'users'));
        
        if (usersSnapshot.exists()) {
            const users = usersSnapshot.val();
            for (const userData of Object.values(users)) {
                if (userData.name === name) {
                    showMessage('この名前は既に使用されています', 'error');
                    return;
                }
            }
        }
        
        // 新規ユーザーを登録
        const userId = generateUserId();
        await set(ref(database, `users/${userId}`), {
            name: name,
            pin: pin,
            createdAt: new Date().toISOString()
        });
        
        showMessage('登録成功！ログイン画面に移動します...', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        
    } catch (error) {
        console.error(error);
        showMessage('エラーが発生しました', 'error');
    }
});
