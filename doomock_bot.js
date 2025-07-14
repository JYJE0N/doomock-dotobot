// 퇴근 관리 - 수정된 /set_work_time 명령어
bot.onText(/\/set_work_time/, (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text.trim();
  const parts = messageText.split(' ');
  
  if (parts.length !== 3) {
    bot.sendMessage(chatId, "❌ 사용법: /set_work_time 08:30 17:30");
    return;
  }
  
  const startTimeStr = parts[1];
  const endTimeStr = parts[2];
  
  // 시간 형식 검증
  if (!startTimeStr.includes(':') || !endTimeStr.includes(':')) {
    bot.sendMessage(chatId, "❌ 시간 형식: HH:MM\n예시: /set_work_time 08:30 17:30");
    return;
  }
  
  const startTime = BotUtils.parseTime(startTimeStr);
  const endTime = BotUtils.parseTime(endTimeStr);
  
  if (!startTime || !endTime) {
    bot.sendMessage(chatId, "❌ 올바른 시간을 입력해주세요\n예시: /set_work_time 08:30 17:30");
    return;
  }
  
  // 논리적 시간 검증
  if (startTime.hours > endTime.hours || 
     (startTime.hours === endTime.hours && startTime.minutes >= endTime.minutes)) {
    bot.sendMessage(chatId, "❌ 퇴근 시간은 출근 시간보다 늦어야 합니다!");
    return;
  }
  
  // workSchedules 객체가 없으므로 추가 필요
  if (!global.workSchedules) {
    global.workSchedules = {};
  }
  
  workSchedules[chatId] = {
    startTime: startTime,
    endTime: endTime,
    enabled: true
  };
  
  const message = `
✅ *근무 시간이 설정되었습니다!*

🌅 출근 시간: ${startTimeStr}
🌙 퇴근 시간: ${endTimeStr}

이제 /퇴근 또는 /time2leave로 남은 시간을 확인하세요!
  `;
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// 수정된 /퇴근시간 명령어 (workSchedules 사용)
bot.onText(/\/퇴근시간/, (msg) => {
  const chatId = msg.chat.id;
  const userName = BotUtils.getUserName(msg);
  
  // workSchedules가 없으면 초기화
  if (!global.workSchedules) {
    global.workSchedules = {};
  }
  
  const schedule = workSchedules[chatId];
  if (!schedule) {
    // 기본 근무시간 사용
    const { startTimeStr, endTimeStr } = WorkTimeManager.getWorkScheduleInfo();
    
    const message = `
⏰ *${userName}님의 근무시간* (기본 설정)

🌅 출근: ${startTimeStr}
🌙 퇴근: ${endTimeStr}

💡 개인 근무시간을 설정하려면:
/set_work_time 08:30 17:30

/퇴근 명령어로 남은 시간을 확인하세요!
    `;
    
    bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
    return;
  }
  
  const startTimeStr = `${schedule.startTime.hours.toString().padStart(2, '0')}:${schedule.startTime.minutes.toString().padStart(2, '0')}`;
  const endTimeStr = `${schedule.endTime.hours.toString().padStart(2, '0')}:${schedule.endTime.minutes.toString().padStart(2, '0')}`;
  
  const message = `
⏰ *${userName}님의 근무시간* (개인 설정)

🌅 출근: ${startTimeStr}
🌙 퇴근: ${endTimeStr}

/퇴근 명령어로 남은 시간을 확인하세요!
  `;
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// WorkTimeManager 클래스에 개인 근무시간 지원 추가
class WorkTimeManagerExtended {
  static handleLeaveTimeCheck(msg) {
    const chatId = msg.chat.id;
    const userName = BotUtils.getUserName(msg);
    const userId = msg.from.id;

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 주말 체크
    if (currentDay === 0 || currentDay === 6) {
      const dayType = currentDay === 0 ? 'sunday' : 'saturday';
      const message = BotUtils.getRandomMessage(messages.weekend[dayType], { name: userName, userId });
      bot.sendMessage(chatId, message);
      return;
    }

    // 개인 근무시간이 설정되어 있는지 확인
    let startTime, endTime;
    
    if (global.workSchedules && workSchedules[chatId]) {
      startTime = workSchedules[chatId].startTime;
      endTime = workSchedules[chatId].endTime;
    } else {
      // 기본 근무시간 사용
      startTime = WORK_SCHEDULE.START_TIME;
      endTime = WORK_SCHEDULE.END_TIME;
    }

    // 출근 전
    if (currentHour < startTime.hours || 
       (currentHour === startTime.hours && currentMinute < startTime.minutes)) {
      this.handleBeforeWork(chatId, userName, userId, startTime, now);
      return;
    }

    // 퇴근 후
    const minutesToLeave = BotUtils.getTimeToLeave(endTime);
    if (minutesToLeave <= 0) {
      this.handleAfterWork(chatId, userName, userId, endTime, currentHour);
      return;
    }

    // 근무 중
    this.handleDuringWork(chatId, userName, minutesToLeave);
  }

  // 나머지 메서드들은 기존과 동일
  static handleBeforeWork(chatId, userName, userId, startTime, now) {
    const workStart = new Date();
    workStart.setHours(startTime.hours, startTime.minutes, 0, 0);
    const diffMs = workStart - now;
    const minutesToWork = Math.floor(diffMs / (1000 * 60));
    const timeMessage = BotUtils.formatTime(minutesToWork);

    if (minutesToWork <= 30) {
      const message = BotUtils.replaceMessagePlaceholders(messages.beforeWork.soon, {
        name: userName,
        time: timeMessage
      });
      bot.sendMessage(chatId, message);
    } else {
      const message = BotUtils.getRandomMessage(messages.beforeWork.early, {
        name: userName,
        time: timeMessage,
        userId
      });
      bot.sendMessage(chatId, message);
    }
  }

  static handleAfterWork(chatId, userName, userId, endTime, currentHour) {
    const hoursSinceWork = currentHour - endTime.hours;
    
    let messageCategory;
    if (hoursSinceWork >= 0 && hoursSinceWork <= 2) {
      messageCategory = messages.afterWork.justLeft;
    } else if (hoursSinceWork <= 5) {
      messageCategory = messages.afterWork.evening;
    } else {
      messageCategory = messages.afterWork.late;
    }

    const message = BotUtils.getRandomMessage(messageCategory, { name: userName, userId });
    bot.sendMessage(chatId, message);
  }

  static handleDuringWork(chatId, userName, minutesToLeave) {
    const timeMessage = BotUtils.formatTime(minutesToLeave);
    const { emoji, comment } = BotUtils.getLeaveTimeEmoji(minutesToLeave);
    
    bot.sendMessage(chatId, `${emoji} ${userName}님의 퇴근까지 ${timeMessage} 남았습니다!${comment}`);
  }

  static getWorkScheduleInfo() {
    const startTimeStr = `${WORK_SCHEDULE.START_TIME.hours.toString().padStart(2, '0')}:${WORK_SCHEDULE.START_TIME.minutes.toString().padStart(2, '0')}`;
    const endTimeStr = `${WORK_SCHEDULE.END_TIME.hours.toString().padStart(2, '0')}:${WORK_SCHEDULE.END_TIME.minutes.toString().padStart(2, '0')}`;
    
    return { startTimeStr, endTimeStr };
  }
}

// 퇴근 명령어들을 새로운 클래스로 교체
bot.onText(/\/퇴근$/, (msg) => WorkTimeManagerExtended.handleLeaveTimeCheck(msg));
bot.onText(/\/time2leave$/, (msg) => WorkTimeManagerExtended.handleLeaveTimeCheck(msg));

// 추가 명령어: 근무시간 초기화
bot.onText(/\/reset_work_time/, (msg) => {
  const chatId = msg.chat.id;
  const userName = BotUtils.getUserName(msg);
  
  if (global.workSchedules && workSchedules[chatId]) {
    delete workSchedules[chatId];
    
    const { startTimeStr, endTimeStr } = WorkTimeManagerExtended.getWorkScheduleInfo();
    
    const message = `
🔄 *${userName}님의 근무시간이 초기화되었습니다!*

기본 근무시간으로 돌아갑니다:
🌅 출근: ${startTimeStr}
🌙 퇴근: ${endTimeStr}

개인 근무시간을 다시 설정하려면:
/set_work_time 08:30 17:30
    `;
    
    bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
  } else {
    bot.sendMessage(chatId, "❌ 설정된 개인 근무시간이 없습니다.\n이미 기본 근무시간을 사용하고 있어요!");
  }
});
