// Firebase設定
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

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
const auth = getAuth(app);

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
        // /pins ノードから照合（認証不要）
        const pinsSnapshot = await get(ref(database, 'pins'));

        if (!pinsSnapshot.exists()) {
            showMessage('ユーザーが見つかりません', 'error');
            return;
        }

        const pins = pinsSnapshot.val();
        let foundUserId = null;

        // 名前とPINが一致するユーザーを探す
        for (const [userId, data] of Object.entries(pins)) {
            if (data.name === name && data.pin === pin) {
                foundUserId = userId;
                break;
            }
        }

        if (!foundUserId) {
            showMessage('名前またはPINが間違っています', 'error');
            return;
        }

        // PIN照合成功 → 匿名サインイン
        await signInAnonymously(auth);

        // ログイン情報をlocalStorageに保存
        localStorage.setItem('userId', foundUserId);
        localStorage.setItem('userName', name);

        showMessage('ログイン成功！', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);

    } catch (error) {
        console.error(error);
        showMessage('エラーが発生しました', 'error');
    }
});
