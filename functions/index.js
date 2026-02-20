const {onSchedule} = require('firebase-functions/v2/scheduler');
const {defineString} = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp({
  databaseURL: 'https://attendance-app-f9a60-default-rtdb.asia-southeast1.firebasedatabase.app'
});

// ← この行を追加
const database = admin.database();

// 環境変数を定義
const gmailEmail = defineString('GMAIL_EMAIL');
const gmailPassword = defineString('GMAIL_PASSWORD_V2');


// ========================================
// Cloud Tasks: 個別ユーザーの出退勤チェック
// ========================================

const {onRequest} = require('firebase-functions/v2/https');


// ========================================
// 共通：出退勤チェック＆メール送信ロジック
// ========================================

async function checkAttendanceAndSendEmail(userId, type) {
  try {
    // JST基準で判定
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    
    // 土日判定
    const dayOfWeek = jstNow.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('Weekend (JST) - skipping attendance check');
      return { success: false, reason: 'weekend' };
    }
    
    // 今日の日付（JST）
    const year = jstNow.getUTCFullYear();
    const month = String(jstNow.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jstNow.getUTCDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    const yearMonth = `${year}-${month}`;
    
    // ユーザー情報を取得
    const userSnapshot = await database.ref(`users/${userId}`).once('value');
    const user = userSnapshot.val();
    
//    console.log('User data:', user);
//    console.log('reminderEnabled:', user?.reminderEnabled);
//    console.log('email:', user?.email);
    
    if (!user || !user.reminderEnabled || !user.email) {
//      console.log('Reminder not enabled');
      return { success: false, reason: 'not_enabled' };
    }
    
    // 今日の記録をチェック
    const recordSnapshot = await database
      .ref(`users/${userId}/records/${yearMonth}/${today}`)
      .once('value');
    const record = recordSnapshot.val();
    
    // 記録がなければメール送信
    const fieldName = type === 'checkin' ? 'checkin' : 'checkout';
    if (!record || !record[fieldName]) {
      const time = type === 'checkin' ? user.remindCheckinTime : user.remindCheckoutTime;
      await sendReminderEmail(user.email, user.name, type, time, userId);
      console.log(`${type} reminder sent to ${user.name}`);
      return { success: true, action: 'sent' };
    } else {
      console.log(`${type} already recorded for ${user.name}`);
      return { success: true, action: 'already_recorded' };
    }
    
  } catch (error) {
    console.error('Error in checkAttendanceAndSendEmail:', error);
    throw error;
  }
}



exports.checkUserAttendance = onRequest({cors:true},async (req, res) => {
  try {
//    console.log('Request body:', req.body);
//    console.log('Request method:', req.method);
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    const {userId, type} = req.body;
    
    if (!userId || !type) {
//      console.log('userId or type is missing');
      res.status(400).send('Missing userId or type');
      return;
    }
    
 //   console.log('Looking for user at path:', `users/${userId}`);
    
    // 共通関数を呼び出す
    const result = await checkAttendanceAndSendEmail(userId, type);
    
    if (result.success) {
      res.status(200).send(result.action);
    } else {
      res.status(200).send(result.reason);
    }
    
  } catch (error) {
    console.error('Error in checkUserAttendance:', error);
    res.status(500).send('Internal server error');
  }
});



// メール送信関数
async function sendReminderEmail(email, name, type, time, userId) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailEmail.value(),
      pass: gmailPassword.value()
    }
  });
  
  const isCheckin = type === 'checkin';
  const subject = isCheckin ? '【出勤記録のリマインダー】' : '【退勤記録のリマインダー】';
  const action = isCheckin ? '出勤' : '退勤';
  const actionParam = isCheckin ? 'checkin' : 'checkout';
  
  // 今日の日付（JST）
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jstNow.getUTCFullYear();
  const month = String(jstNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstNow.getUTCDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  
  const mailOptions = {
    from: gmailEmail.value(),
    to: email,
    subject: subject,
    html: `
      <p>${name} 様</p>
      <p>本日（${today}）の${action}記録がまだ完了していません。</p>
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
 //   console.log(`Reminder email sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
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
    
//    console.log(`Creating task: userId=${userId}, type=${type}, scheduleTime=${scheduleTime.toISOString()}`);
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
exports.createDailyTasks = onRequest({cors: true}, async (req, res) => {
  try {
//    console.log('Request body:', req.body);
//    console.log('Request method:', req.method);
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    const {userId} = req.body;
    
    if (!userId) {
 //     console.log('userId is missing in createDailyTasks');
      res.status(400).send('Missing userId');
      return;
    }
    
    const userSnapshot = await database.ref(`users/${userId}`).once('value');
    const user = userSnapshot.val();
    
    if (!user || !user.reminderEnabled) {
      res.status(200).send('Reminder not enabled');
      return;
    }
    
    // 現在時刻（UTC）
    const now = new Date();

    // 今日の日付（JST基準）
    const todayJST = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const dayOfWeek = todayJST.getUTCDay();

//    console.log('Today JST:', todayJST.toISOString(), 'Day of week:', dayOfWeek);

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      res.status(200).send('Today is weekend (JST) - skipped');
      return;
    }

    // 今日の日付（UTC基準、時刻計算用）
    const today = new Date();

      
    let taskCount = 0;
    let immediateCount = 0;
    
    // 出勤タスク
    if (user.remindCheckinTime) {
      const [hours, minutes] = user.remindCheckinTime.split(':');
      const jstHours = parseInt(hours);
      const jstMinutes = parseInt(minutes);
      
      // UTC時刻を計算（-9時間）
      let utcHours = jstHours - 9;
      let utcDay = new Date(today);
      
      if (utcHours < 0) {
        utcHours += 24;
	utcDay.setUTCDate(utcDay.getUTCDate() - 1);
      }
      
      const checkinTimeUTC = new Date(utcDay);
      checkinTimeUTC.setUTCHours(utcHours, jstMinutes, 0, 0);
      
      // 未来ならタスク作成、過去なら即実行
      if (checkinTimeUTC > now) {
        await createAttendanceTask(userId, 'checkin', checkinTimeUTC);
        taskCount++;
 //       console.log('Created checkin task for future time');
      } else {
        console.log('Checkin time has passed - executing immediately');
        await checkAttendanceAndSendEmail(userId, 'checkin');
        immediateCount++;
      }
    }
    
    // 退勤タスク
    if (user.remindCheckoutTime) {
      const [hours, minutes] = user.remindCheckoutTime.split(':');
      const jstHours = parseInt(hours);
      const jstMinutes = parseInt(minutes);
      
      let utcHours = jstHours - 9;
      let utcDay = new Date(today);
      
      if (utcHours < 0) {
        utcHours += 24;
	utcDay.setUTCDate(utcDay.getUTCDate() - 1);
      }
      
      const checkoutTimeUTC = new Date(utcDay);
      checkoutTimeUTC.setUTCHours(utcHours, jstMinutes, 0, 0);
      
      if (checkoutTimeUTC > now) {
        await createAttendanceTask(userId, 'checkout', checkoutTimeUTC);
        taskCount++;
        console.log('Created checkout task for future time');
      } else {
 //       console.log('Checkout time has passed - executing immediately');
        await checkAttendanceAndSendEmail(userId, 'checkout');
        immediateCount++;
      }
    }
    
    res.status(200).send(`Created ${taskCount} tasks, executed ${immediateCount} immediately`);
    
  } catch (error) {
    console.error('Error in createDailyTasks:', error);
    res.status(500).send('Internal server error');
  }
});




exports.scheduleDailyTasks = onSchedule(
  {
    schedule: '45 3 * * *',  // UTC 14:00 = JST 23:00
    timeZone: 'UTC'
  },
  async (event) => {
    console.log('Starting daily task creation...');
    
    try {
      const usersSnapshot = await database.ref('users').once('value');
      const users = usersSnapshot.val();
      
      if (!users) {
        console.log('No users found');
        return;
      }
      
      // 明日の日付（UTC）
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      
      // JST基準で土日判定（UTC+9時間）
      const tomorrowJST = new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000);
      const dayOfWeek = tomorrowJST.getUTCDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log('Tomorrow is weekend (JST) - skipped');
        return;
      }
      
      let taskCount = 0;
      
      for (const [userId, user] of Object.entries(users)) {
        if (!user.reminderEnabled || !user.email) {
          continue;
        }
        
        // 出勤タスク（JST → UTC変換）
        if (user.remindCheckinTime) {
          const [hours, minutes] = user.remindCheckinTime.split(':');
          const checkinTimeUTC = new Date(tomorrow);
          // JST時刻からUTC時刻を計算（-9時間）
          checkinTimeUTC.setUTCHours(parseInt(hours) - 9, parseInt(minutes), 0, 0);
          await createAttendanceTask(userId, 'checkin', checkinTimeUTC);
          taskCount++;
        }
        
        // 退勤タスク
        if (user.remindCheckoutTime) {
          const [hours, minutes] = user.remindCheckoutTime.split(':');
          const checkoutTimeUTC = new Date(tomorrow);
          checkoutTimeUTC.setUTCHours(parseInt(hours) - 9, parseInt(minutes), 0, 0);
          await createAttendanceTask(userId, 'checkout', checkoutTimeUTC);
          taskCount++;
        }
      }
      
      console.log(`Created ${taskCount} tasks for tomorrow`);
      
    } catch (error) {
      console.error('Error in scheduleDailyTasks:', error);
    }
  }
);
