import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, get, set, remove } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyDoGXkV8qcg0leHZ3SpKekikJ8JaQW70s4",
    authDomain: "attendance-app-f9a60.firebaseapp.com",
    databaseURL: "https://attendance-app-f9a60-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "attendance-app-f9a60",
    storageBucket: "attendance-app-f9a60.firebasestorage.app",
    messagingSenderId: "940337246680",
    appId: "1:940337246680:web:c075eeca6e436db0e702ad"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

const userId = localStorage.getItem('userId');
const userName = localStorage.getItem('userName');

// タブ切り替え
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
    });
});

// 月セレクト初期化
function initMonthSelects() {
    const now = new Date();
    const selects = ['calendar-month', 'list-month'];
    selects.forEach(id => {
        const sel = document.getElementById(id);
        sel.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const label = `${d.getFullYear()}年${d.getMonth()+1}月`;
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = label;
            sel.appendChild(opt);
        }
    });
}

// カレンダー表示
async function displayCalendar() {
    const yearMonth = document.getElementById('calendar-month').value;
    if (!yearMonth) return;

    const [year, month] = yearMonth.split('-').map(Number);
    const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}`));
    const records = snapshot.exists() ? snapshot.val() : {};

    const calendarEl = document.getElementById('calendar-view');
    calendarEl.innerHTML = '';

    const days = ['日', '月', '火', '水', '木', '金', '土'];
    days.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day header';
        header.textContent = day;
        calendarEl.appendChild(header);
    });

    const firstDay = new Date(year, month - 1, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
        calendarEl.appendChild(document.createElement('div'));
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
        const record = records[dateStr] || {};

        const cell = document.createElement('div');
        cell.className = 'calendar-day';

        const today = new Date();
        if (day === today.getDate() && month === today.getMonth()+1 && year === today.getFullYear()) {
            cell.classList.add('today');
        }

        const dow = new Date(year, month-1, day).getDay();
        if (dow === 0) cell.style.color = '#ef4444';
        if (dow === 6) cell.style.color = '#3b82f6';

        if (record.checkin) cell.classList.add('has-record');

        cell.innerHTML = `
            <div>${day}</div>
            ${record.checkin ? `<div style="font-size:10px">${record.checkin}</div>` : ''}
            ${record.checkout ? `<div style="font-size:10px">${record.checkout}</div>` : ''}
        `;
        calendarEl.appendChild(cell);
    }
}

// リスト表示
async function displayList() {
    const yearMonth = document.getElementById('list-month').value;
    if (!yearMonth) return;

    const [year, month] = yearMonth.split('-').map(Number);
    const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}`));
    const records = snapshot.exists() ? snapshot.val() : {};

    const listEl = document.getElementById('record-list');
    listEl.innerHTML = '';

    const daysInMonth = new Date(year, month, 0).getDate();
    let hasRecord = false;

    for (let day = daysInMonth; day >= 1; day--) {
        const dateStr = `${yearMonth}-${String(day).padStart(2,'0')}`;
        const record = records[dateStr] || {};
        if (!record.checkin && !record.checkout) continue;

        hasRecord = true;
        const dow = ['日','月','火','水','木','金','土'][new Date(year, month-1, day).getDay()];
        const item = document.createElement('div');
        item.className = 'record-item';
        item.innerHTML = `
            <div>${month}/${day}（${dow}）</div>
            <div>出勤: ${record.checkin || '—'}</div>
            <div>退勤: ${record.checkout || '—'}</div>
            <div>${record.note || ''}</div>
        `;
        listEl.appendChild(item);
    }

    if (!hasRecord) {
        listEl.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">記録がありません</div>';
    }
}

// CSV出力
document.getElementById('export-csv-btn').addEventListener('click', async () => {
    const yearMonth = document.getElementById('list-month').value;
    if (!yearMonth) return;
    const [year, month] = yearMonth.split('-').map(Number);
    const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}`));
    const records = snapshot.exists() ? snapshot.val() : {};

    let csv = '日付,曜日,出勤,退勤,備考\n';
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${yearMonth}-${String(day).padStart(2,'0')}`;
        const record = records[dateStr] || {};
        const dow = ['日','月','火','水','木','金','土'][new Date(year, month-1, day).getDay()];
        csv += `${dateStr},${dow},${record.checkin||''},${record.checkout||''},${record.note||''}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `出退勤_${yearMonth}.csv`;
    a.click();
});

// PDF出力
document.getElementById('export-pdf-btn').addEventListener('click', async () => {
    const yearMonth = document.getElementById('list-month').value;
    if (!yearMonth) return;
    const [year, month] = yearMonth.split('-').map(Number);
    const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}`));
    const records = snapshot.exists() ? snapshot.val() : {};

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text(`Attendance Record - ${yearMonth}`, 10, 20);
    doc.setFontSize(12);

    let y = 35;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${yearMonth}-${String(day).padStart(2,'0')}`;
        const record = records[dateStr] || {};
        if (!record.checkin && !record.checkout) continue;
        doc.text(`${dateStr}  In: ${record.checkin||'-'}  Out: ${record.checkout||'-'}`, 10, y);
        y += 8;
        if (y > 280) { doc.addPage(); y = 20; }
    }

    doc.save(`出退勤_${yearMonth}.pdf`);
});

// 修正タブ
document.getElementById('save-edit-btn').addEventListener('click', async () => {
    const date = document.getElementById('edit-date').value;
    if (!date) { alert('日付を入力してください'); return; }

    const yearMonth = date.substring(0, 7);
    const checkin = document.getElementById('edit-checkin').value;
    const checkout = document.getElementById('edit-checkout').value;
    const note = document.getElementById('edit-note').value;
    const absent = document.getElementById('edit-absent').checked;

    await set(ref(database, `users/${userId}/records/${yearMonth}/${date}`), {
        ...(checkin && { checkin }),
        ...(checkout && { checkout }),
        ...(note && { note }),
        ...(absent && { absent: true })
    });

    document.getElementById('edit-message').textContent = '保存しました';
    setTimeout(() => { document.getElementById('edit-message').textContent = ''; }, 3000);
});

document.getElementById('delete-record-btn').addEventListener('click', async () => {
    const date = document.getElementById('edit-date').value;
    if (!date) { alert('日付を入力してください'); return; }
    if (!confirm(`${date}の記録を削除しますか？`)) return;

    const yearMonth = date.substring(0, 7);
    await remove(ref(database, `users/${userId}/records/${yearMonth}/${date}`));
    document.getElementById('edit-message').textContent = '削除しました';
    setTimeout(() => { document.getElementById('edit-message').textContent = ''; }, 3000);
});

// 設定タブ
async function loadSettings() {
    const snapshot = await get(ref(database, `users/${userId}`));
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    document.getElementById('reminder-enabled').checked = data.reminderEnabled || false;
    document.getElementById('reminder-email').value = data.email || '';
    document.getElementById('reminder-checkin-time').value = data.remindCheckinTime || '09:00';
    document.getElementById('reminder-checkout-time').value = data.remindCheckoutTime || '18:00';
}

document.getElementById('save-reminder-btn').addEventListener('click', async () => {
    await set(ref(database, `users/${userId}/reminderEnabled`), document.getElementById('reminder-enabled').checked);
    await set(ref(database, `users/${userId}/email`), document.getElementById('reminder-email').value);
    await set(ref(database, `users/${userId}/remindCheckinTime`), document.getElementById('reminder-checkin-time').value);
    await set(ref(database, `users/${userId}/remindCheckoutTime`), document.getElementById('reminder-checkout-time').value);
    document.getElementById('reminder-message').textContent = '保存しました';
    setTimeout(() => { document.getElementById('reminder-message').textContent = ''; }, 3000);
});

// 月変更イベント
document.getElementById('calendar-month').addEventListener('change', displayCalendar);
document.getElementById('list-month').addEventListener('change', displayList);

// ログアウト
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    window.location.href = 'login.html';
});

// 認証確認してから起動
onAuthStateChanged(auth, (user) => {
    if (user && userId && userName) {
        document.getElementById('user-name').textContent = userName;
        initMonthSelects();
        displayCalendar();
        displayList();
        loadSettings();
    } else {
        window.location.href = 'login.html';
    }
});
