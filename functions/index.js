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

// ========================================
// Cloud Tasks: 個別ユーザーの出退勤チェック
// ========================================

const {onRequest} = require('firebase-functions/v2/https');

exports.checkUserAttendance = onRequest({cors:true},async (req, res) => {
  try {
      // OPTIONS リクエスト（プリフライト）への対応
      if (req.method === 'OPTIONS') {
	  res.status(204).send('');
	  return;
      }

      

      const {userId, type} = req.body; // type: 'checkin' or 'checkout'
    
      if (!userId || !type) {
	  console.log('userId is missing');
	  res.status(400).send('Missing userId or type');
	  return;
      }
    
    // 日本時間（JST）を取得
    const now = new Date();
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    
    // 土日はスキップ
    const dayOfWeek = jstDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('Weekend - skipping attendance check');
      res.status(200).send('Weekend - skipped');
      return;
    }
    
    const today = getTodayDate();
    const yearMonth = today.substring(0, 7);
    
    // ユーザー情報を取得
    const userSnapshot = await admin.database().ref(`users/${userId}`).once('value');
    const user = userSnapshot.val();
    
    if (!user || !user.reminderEnabled || !user.email) {
      res.status(200).send('Reminder not enabled');
      return;
    }
    
    // 今日の記録をチェック
    const recordSnapshot = await admin.database()
      .ref(`users/${userId}/records/${yearMonth}/${today}`)
      .once('value');
    const record = recordSnapshot.val();
    
    // 記録がなければメール送信
    const fieldName = type === 'checkin' ? 'checkin' : 'checkout';
    if (!record || !record[fieldName]) {
      const time = type === 'checkin' ? user.remindCheckinTime : user.remindCheckoutTime;
      await sendReminderEmail(user.email, user.name, type, time, userId);
      console.log(`${type} reminder sent to ${user.name}`);
      res.status(200).send('Reminder sent');
    } else {
      console.log(`${type} already recorded for ${user.name}`);
      res.status(200).send('Already recorded');
    }
    
  } catch (error) {
    console.error('Error in checkUserAttendance:', error);
    res.status(500).send('Internal server error');
  }
});


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



// ========================================
// Cloud Tasks: タスク作成
// ========================================

const {CloudTasksClient} = require('@google-cloud/tasks');
const tasksClient = new CloudTasksClient();

const project = 'attendance-app-f9a60';
const location = 'us-central1';
const queue = 'attendance-reminders';

// タスク作成関数
async function createAttendanceTask(userId, type, scheduleTime) {
  const url = `https://us-central1-${project}.cloudfunctions.net/checkUserAttendance`;
  
  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/json',
      },
      body: Buffer.from(JSON.stringify({
        userId: userId,
        type: type
      })).toString('base64'),
    },
    scheduleTime: {
      seconds: Math.floor(scheduleTime.getTime() / 1000),
    },
  };

  const queuePath = tasksClient.queuePath(project, location, queue);
  
  try {
    const [response] = await tasksClient.createTask({
      parent: queuePath,
      task: task,
    });
    console.log(`Task created: ${response.name}`);
    return response;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

// 明日のタスクを作成
exports.createDailyTasks = onRequest({cors:true},async (req, res) => {
  try {
    
      // OPTIONS リクエスト（プリフライト）への対応
      if (req.method === 'OPTIONS') {
	  res.status(204).send('');
	  return;
      }

      const {userId} = req.body;
    
    if (!userId) {
      res.status(400).send('Missing userId');
      return;
    }
    
    // ユーザー情報を取得
    const userSnapshot = await admin.database().ref(`users/${userId}`).once('value');
    const user = userSnapshot.val();
    
    if (!user || !user.reminderEnabled) {
      res.status(200).send('Reminder not enabled');
      return;
    }
    
    // 明日の日付を取得（JST）
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const jstTomorrow = new Date(tomorrow.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    
    // 土日はスキップ
//    const dayOfWeek = jstTomorrow.getDay();
//    if (dayOfWeek === 0 || dayOfWeek === 6) {
//      res.status(200).send('Tomorrow is weekend - skipped');
//      return;
//    }
    
    // 出勤タスク作成
    if (user.remindCheckinTime) {
      const [hours, minutes] = user.remindCheckinTime.split(':');
      const checkinTime = new Date(jstTomorrow);
      checkinTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      await createAttendanceTask(userId, 'checkin', checkinTime);
    }
    
    // 退勤タスク作成
    if (user.remindCheckoutTime) {
      const [hours, minutes] = user.remindCheckoutTime.split(':');
      const checkoutTime = new Date(jstTomorrow);
      checkoutTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      await createAttendanceTask(userId, 'checkout', checkoutTime);
    }
    
    res.status(200).send('Tasks created successfully');
    
  } catch (error) {
    console.error('Error in createDailyTasks:', error);
    res.status(500).send('Internal server error');
  }
});
