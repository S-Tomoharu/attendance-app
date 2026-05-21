import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
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

let userId = localStorage.getItem('userId');
let userName = localStorage.getItem('userName');

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

function updateMonthDisplay() {
    document.getElementById('current-month').textContent = 
        `${currentYear}年${currentMonth}月`;
}

document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    updateMonthDisplay();
    displayCalendar();
    displayList();
});

document.getElementById('next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    updateMonthDisplay();
    displayCalendar();
    displayList();
});

async function displayCalendar() {
    const yearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}`));
    const records = snapshot.exists() ? snapshot.val() : {};

    const calendarEl = document.getElementById('calendar');
    calendarEl.innerHTML = '';

    const days = ['日', '月', '火', '水', '木', '金', '土'];
    days.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.textContent = day;
        calendarEl.appendChild(header);
    });

    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
        calendarEl.appendChild(document.createElement('div'));
    }

    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
        const record = records[dateStr] || {};

        const cell = document.createElement('div');
        cell.className = 'calendar-cell';

        const today = new Date();
        if (day === today.getDate() && currentMonth === today.getMonth() + 1 && currentYear === today.getFullYear()) {
            cell.classList.add('today');
        }

        const dayOfWeek = new Date(currentYear, currentMonth - 1, day).getDay();
        if (dayOfWeek === 0) cell.classList.add('sunday');
        if (dayOfWeek === 6) cell.classList.add('saturday');

        if (record.checkin) cell.classList.add('has-record');

        cell.innerHTML = `
            <div class="day-number">${day}</div>
            ${record.checkin ? `<div class="record-time">${record.checkin}</div>` : ''}
        `;
        calendarEl.appendChild(cell);
    }
}

async function displayList() {
    const yearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const snapshot = await get(ref(database, `users/${userId}/records/${yearMonth}`));
    const records = snapshot.exists() ? snapshot.val() : {};

    const listEl = document.getElementById('records-list');
    listEl.innerHTML = '';

    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    for (let day = daysInMonth; day >= 1; day--) {
        const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
        const record = records[dateStr] || {};

        if (!record.checkin && !record.checkout) continue;

        const date = new Date(currentYear, currentMonth - 1, day);
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

        const item = document.createElement('div');
        item.className = 'record-item';
        item.innerHTML = `
            <div class="record-date">${currentMonth}/${day}（${dayOfWeek}）</div>
            <div class="record-times">
                <span>出勤: ${record.checkin || '—'}</span>
                <span>退勤: ${record.checkout || '—'}</span>
            </div>
        `;
        listEl.appendChild(item);
    }

    if (listEl.innerHTML === '') {
        listEl.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">記録がありません</div>';
    }
}

// 認証状態を確認してから起動
onAuthStateChanged(auth, (user) => {
    if (user && userId && userName) {
        document.getElementById('user-name').textContent = userName;
        updateMonthDisplay();
        displayCalendar();
        displayList();
    } else {
        window.location.href = 'login.html';
    }
});
