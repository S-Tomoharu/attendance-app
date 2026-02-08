const {onSchedule} = require('firebase-functions/v2/scheduler');
const {defineString} = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// 環境変数を定義
const gmailEmail = defineString('GMAIL_EMAIL');
const gmailPassword = defineString('GMAIL_PASSWORD');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail.value(),
    pass: gmailPassword.value()
  }
});

// 毎時0分に実行（1日24回）
exports.checkAttendance = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'Asia/Tokyo'
  },
  async (event) => {
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = '00'; // 毎時0分実行
    const currentTime = `${currentHour}:${currentMinute}`;
    
    const today = getTodayDate();
    const yearMonth = today.substring(0, 7);
    
    console.log(`Checking attendance at ${currentTime}`);
    
    // 全ユーザーを取得
    const usersSnapshot = await admin.database().ref('users').once('value');
    const users = usersSnapshot.val();
    
    if (!users) {
      console.log('No users found');
      return;
    }
    
    for (const userId in users) {
      const user = users[userId];
      
      // リマインダー設定がない場合はスキップ
      if (!user.reminderEnabled || !user.email) {
        continue;
      }
      
      // 今日の記録をチェック
      const recordSnapshot = await admin.database()
        .ref(`users/${userId}/records/${yearMonth}/${today}`)
        .once('value');
      const record = recordSnapshot.val();
      
      // 出勤時刻チェック
      if (user.remindCheckinTime === currentTime) {
        if (!record || !record.checkin) {
          await sendReminderEmail(
            user.email,
            user.name,
            'checkin',
            user.remindCheckinTime,
            userId
          );
          console.log(`Checkin reminder sent to ${user.name}`);
        }
      }
      
      // 退勤時刻チェック
      if (user.remindCheckoutTime === currentTime) {
        if (!record || !record.checkout) {
          await sendReminderEmail(
            user.email,
            user.name,
            'checkout',
            user.remindCheckoutTime,
            userId
          );
          console.log(`Checkout reminder sent to ${user.name}`);
        }
      }
    }
    
    console.log('Attendance check completed');
  }
);

// メール送信関数
async function sendReminderEmail(email, name, type, time, userId) {
  const isCheckin = type === 'checkin';
  const subject = isCheckin ? '【出勤記録のリマインダー】' : '【退勤記録のリマインダー】';
  const action = isCheckin ? '出勤' : '退勤';
  const actionParam = isCheckin ? 'checkin' : 'checkout';
  
  const mailOptions = {
    from: gmailEmail.value(),
    to: email,
    subject: subject,
    html: `
      <p>${name} 様</p>
      <p>本日（${getTodayDate()}）の${action}記録がまだ完了していません。</p>
      <p>設定時刻：${time}</p>
      <p>下記のリンクから記録してください。</p>
      <p><a href="https://s-tomoharu.github.io/attendance-app/?action=${actionParam}&userId=${userId}">
        ${action}を記録する
      </a></p>
      <p>※このメールは自動送信されています。</p>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// 今日の日付取得（YYYY-MM-DD）
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
