import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

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
const auth = getAuth(app);

// DOM要素
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const errorDiv = document.getElementById('error');

// ログインフォーム送信
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showError('メールアドレスとパスワードを入力してください');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'ログイン中...';
    errorDiv.style.display = 'none';
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // ログイン成功 → 管理者画面へ
        window.location.href = 'admin.html';
        
    } catch (error) {
        console.error('Login error:', error);
        
        let message = 'ログインに失敗しました';
        
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            message = 'メールアドレスまたはパスワードが正しくありません';
        } else if (error.code === 'auth/user-not-found') {
            message = 'ユーザーが見つかりません';
        } else if (error.code === 'auth/invalid-email') {
            message = 'メールアドレスの形式が正しくありません';
        }
        
        showError(message);
        loginBtn.disabled = false;
        loginBtn.textContent = 'ログイン';
    }
});

// エラー表示
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}
