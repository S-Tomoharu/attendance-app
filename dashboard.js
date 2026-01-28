// Firebase設定
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, get, set, remove } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

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

// ログインチェック
const userId = localStorage.getItem('userId');
const userName = localStorage.getItem('userName');

if (!userId || !userName) {
    window.location.href = 'login.html';
} else {
    document.getElementById('user-name').textContent = `${userName} さん`;
}

// ログアウト
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    window.location.href = 'login.html';
});

// タブ切り替え
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // すべてのタブを非アクティブに
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        // クリックされたタブをアクティブに
        tab.classList.add('active');
        const tabName = tab.getAttribute('data-tab');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// 月選択のドロップダウンを生成
function generateMonthOptions() {
    const now = new Date();
    const calendarSelect = document.getElementById('calendar-month');
    const listSelect = document.getElementById('list-month');
    
    // 過去12ヶ月分を生成
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const value = `${year}-${month}`;
        const text = `${year}年${month}月`;
        
        const option1 = document.createElement('option');
        option1.value = value;
        option1.textContent = text;
        calendarSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = value;
        option2.textContent = text;
        listSelect.appendChild(option2);
    }
    
    // デフォルトで今月を選択
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    calendarSelect.value = currentMonth;
    listSelect.value = currentMonth;
}

// カレンダー表示
async function displayCalendar(yearMonth) {
    const calendarView = document.getElementById('calendar-view');
    calendarView.innerHTML = '';
    
    const [year, month] = yearMonth.split('-');
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    // 曜日ヘッダー
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    weekdays.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day header';
        header.textContent = day;
        calendarView.appendChild(header);
    });
    
    // 空白セル（月初めまで）
    for (let i = 0; i < startDayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day';
        calendarView.appendChild(empty);
    }
    
    // Firebaseからデータ取得
    const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}`));
    const records = snapshot.exists() ? snapshot.val() : {};
    
    // 日付セル
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateKey = `${yearMonth}-${dayStr}`;
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        const dayData = records[dateKey];
        if (dayData) {
            dayCell.classList.add('has-record');
            const checkin = dayData.checkin || '-';
            const checkout = dayData.checkout || '-';
            dayCell.innerHTML = `
                <div style="font-weight: bold;">${day}</div>
                <div style="font-size: 10px; margin-top: 5px;">
                    ↓${checkin}<br>
                    ↑${checkout}
                </div>
            `;
            
            // クリックで詳細表示
            dayCell.addEventListener('click', () => {
                alert(`${dateKey}\n出勤: ${checkin}\n退勤: ${checkout}\n備考: ${dayData.note || 'なし'}`);
            });
        } else {
            dayCell.textContent = day;
        }
        
        calendarView.appendChild(dayCell);
    }
}

// 月次一覧表示
async function displayList(yearMonth) {
    const recordList = document.getElementById('record-list');
    recordList.innerHTML = '';
    
    const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}`));
    const records = snapshot.exists() ? snapshot.val() : {};
    
    if (Object.keys(records).length === 0) {
        recordList.innerHTML = '<p>記録がありません</p>';
        return;
    }
    
    // 日付でソート
    const sortedDates = Object.keys(records).sort();
    
    sortedDates.forEach(date => {
        const record = records[date];
        const item = document.createElement('div');
        item.className = 'record-item';
        item.innerHTML = `
            <div>${date}</div>
            <div>出勤: ${record.checkin || '-'}</div>
            <div>退勤: ${record.checkout || '-'}</div>
            <div>備考: ${record.note || '-'}</div>
        `;
        recordList.appendChild(item);
    });
}

// 月選択の変更イベント
document.getElementById('calendar-month').addEventListener('change', (e) => {
    if (e.target.value) {
        displayCalendar(e.target.value);
    }
});

document.getElementById('list-month').addEventListener('change', (e) => {
    if (e.target.value) {
        displayList(e.target.value);
    }
});

// 手動修正機能
document.getElementById('save-edit-btn').addEventListener('click', async () => {
    const date = document.getElementById('edit-date').value;
    const checkin = document.getElementById('edit-checkin').value;
    const checkout = document.getElementById('edit-checkout').value;
    const absent = document.getElementById('edit-absent').checked;
    const note = document.getElementById('edit-note').value;
    
    if (!date) {
        alert('日付を選択してください');
        return;
    }
    
    const yearMonth = date.substring(0, 7); // YYYY-MM
    const recordData = {
        checkin: absent ? '欠勤' : checkin || '',
        checkout: absent ? '欠勤' : checkout || '',
        note: note,
        status: absent ? 'absent' : 'present'
    };
    
    try {
        await set(ref(database, `users/${userId}/records/${yearMonth}/${date}`), recordData);
        document.getElementById('edit-message').textContent = '✓ 保存しました';
        document.getElementById('edit-message').style.color = '#22c55e';
        
        // フォームをクリア
        setTimeout(() => {
            document.getElementById('edit-date').value = '';
            document.getElementById('edit-checkin').value = '';
            document.getElementById('edit-checkout').value = '';
            document.getElementById('edit-absent').checked = false;
            document.getElementById('edit-note').value = '';
            document.getElementById('edit-message').textContent = '';
        }, 2000);
    } catch (error) {
        document.getElementById('edit-message').textContent = 'エラーが発生しました';
        document.getElementById('edit-message').style.color = '#ef4444';
        console.error(error);
    }
});

// 削除機能
document.getElementById('delete-record-btn').addEventListener('click', async () => {
    const date = document.getElementById('edit-date').value;
    
    if (!date) {
        alert('日付を選択してください');
        return;
    }
    
    if (!confirm(`${date} の記録を削除しますか？`)) {
        return;
    }
    
    const yearMonth = date.substring(0, 7);
    
    try {
        await remove(ref(database, `users/${userId}/records/${yearMonth}/${date}`));
        document.getElementById('edit-message').textContent = '✓ 削除しました';
        document.getElementById('edit-message').style.color = '#22c55e';
        
        // フォームをクリア
        setTimeout(() => {
            document.getElementById('edit-date').value = '';
            document.getElementById('edit-checkin').value = '';
            document.getElementById('edit-checkout').value = '';
            document.getElementById('edit-absent').checked = false;
            document.getElementById('edit-note').value = '';
            document.getElementById('edit-message').textContent = '';
        }, 2000);
    } catch (error) {
        document.getElementById('edit-message').textContent = 'エラーが発生しました';
        document.getElementById('edit-message').style.color = '#ef4444';
        console.error(error);
    }
});

// 日付選択時に既存データを読み込み
document.getElementById('edit-date').addEventListener('change', async (e) => {
    const date = e.target.value;
    if (!date) return;
    
    const yearMonth = date.substring(0, 7);
    const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}/${date}`));
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        document.getElementById('edit-checkin').value = data.checkin === '欠勤' ? '' : data.checkin || '';
        document.getElementById('edit-checkout').value = data.checkout === '欠勤' ? '' : data.checkout || '';
        document.getElementById('edit-absent').checked = data.status === 'absent';
        document.getElementById('edit-note').value = data.note || '';
    } else {
        // データがない場合はクリア
        document.getElementById('edit-checkin').value = '';
        document.getElementById('edit-checkout').value = '';
        document.getElementById('edit-absent').checked = false;
        document.getElementById('edit-note').value = '';
    }
});

// 初期化
generateMonthOptions();
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
displayCalendar(currentMonth);
displayList(currentMonth);
