// ==================== 수정된 퇴근 관리 명령어 ====================

// /set_work_time 명령어 (정규표현식 대신 텍스트 파싱)
bot.onText(/\/set_work_time/, (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text.trim();
  
  // "set_work_time 08:30 17:30" 형식 파싱
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
  
  const startTime = utils.parseTime(startTimeStr);
  const endTime = utils.parseTime(endTimeStr);
  
  if (!startTime || !endTime) {
    bot.sendMessage(chatId, "❌ 올바른 시간을 입력해주세요\n예시: /set_work_time 08:30 17:30");
    return;
  }
  
  // 근무 스케줄 저장
  workSchedules[chatId] = {
    startTime,
    endTime,
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

// 퇴근 시간 체크 (개선된 버전)
const handleLeaveTimeCheck = (msg) => {
  const chatId = msg.chat.id;
  const userName = utils.getUserName(msg);
  
  // 스케줄 확인
  const schedule = workSchedules[chatId];
  if (!schedule) {
    bot.sendMessage(chatId, `${userName}님, 근무시간을 먼저 설정해주세요!\n\n/set_work_time 08:30 17:30`);
    return;
  }
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // 주말 체크
  if (currentDay === 0 || currentDay === 6) {
    const dayName = currentDay === 0 ? '일요일' : '토요일';
    const messages = [
      `🏠 ${userName}님, 오늘은 ${dayName}이에요! 푹 쉬세요~`,
      `😴 주말인데 왜 퇴근을 생각하고 계세요? 휴식하세요!`,
      `🎮 ${dayName}에는 취미생활을 즐겨보세요!`,
      `☕ 여유로운 주말 보내시길 바라요~`
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    bot.sendMessage(chatId, randomMessage);
    return;
  }
  
  const startTime = schedule.startTime;
  const endTime = schedule.endTime;
  
  // 현재 시간이 출근 전인지 체크
  if (currentHour < startTime.hours || 
     (currentHour === startTime.hours && currentMinute < startTime.minutes)) {
    
    // 출근까지 남은 시간 계산
    const workStart = new Date();
    workStart.setHours(startTime.hours, startTime.minutes, 0, 0);
    const diffMs = workStart - now;
    const minutesToWork = Math.floor(diffMs / (1000 * 60));
    const hoursToWork = Math.floor(minutesToWork / 60);
    const remainingMinutes = minutesToWork % 60;
    
    let timeToWorkMessage;
    if (hoursToWork > 0) {
      timeToWorkMessage = `${hoursToWork}시간 ${remainingMinutes}분`;
    } else {
      timeToWorkMessage = `${remainingMinutes}분`;
    }
    
    const earlyMessages = [
      `☕ ${userName}님, 아직 출근 전이에요! 출근까지 ${timeToWorkMessage} 남았어요.`,
      `🌅 일찍 일어나셨네요! 여유로운 아침 ${timeToWorkMessage} 즐기세요~`,
      `🥐 출근 전 ${timeToWorkMessage}, 맛있는 아침식사 드세요!`,
      `📰 출근까지 ${timeToWorkMessage} 남았어요. 뉴스라도 보실까요?`
    ];
    
    if (minutesToWork <= 30) {
      bot.sendMessage(chatId, `⏰ ${userName}님, 곧 출근시간이에요! ${timeToWorkMessage} 후 출근 준비하세요!`);
    } else {
      const randomMessage = earlyMessages[Math.floor(Math.random() * earlyMessages.length)];
      bot.sendMessage(chatId, randomMessage);
    }
    return;
  }
  
  // 퇴근 시간이 지났는지 체크
  const minutesToLeave = utils.getTimeToLeave(endTime);
  
  if (minutesToLeave <= 0) {
    // 퇴근 후 시간대별 메시지
    const hoursSinceWork = currentHour - endTime.hours;
    
    if (hoursSinceWork >= 0 && hoursSinceWork <= 2) {
      // 퇴근 직후 (5:30 ~ 7:30)
      const justLeftMessages = [
        `🎉 ${userName}님, 퇴근하셨나요? 오늘도 수고하셨어요!`,
        `🚗 퇴근길 조심히 가세요! 오늘 하루도 고생했어요!`,
        `🍽️ 퇴근 후 맛있는 저녁 드세요~`,
        `📱 이제 개인 시간이에요! 편안한 저녁 되세요!`
      ];
      const randomMessage = justLeftMessages[Math.floor(Math.random() * justLeftMessages.length)];
      bot.sendMessage(chatId, randomMessage);
    } else if (hoursSinceWork <= 5) {
      // 저녁 시간 (7:30 ~ 10:30)
      const eveningMessages = [
        `🌙 ${userName}님, 좋은 저녁 시간 보내고 계신가요?`,
        `📺 저녁 시간이네요! 드라마나 영화 어때요?`,
        `🍷 오늘 하루도 마무리! 내일도 화이팅하세요!`,
        `💤 일찍 주무셔야 내일 컨디션이 좋아요~`
      ];
      const randomMessage = eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
      bot.sendMessage(chatId, randomMessage);
    } else {
      // 늦은 시간 (10:30 이후)
      const lateMessages = [
        `😴 ${userName}님, 늦은 시간이에요! 푹 주무세요~`,
        `🌙 내일을 위해 일찍 잠자리에 드세요!`,
        `💤 좋은 꿈 꾸시고 내일 아침에 만나요!`,
        `🛌 충분한 휴식이 최고의 자기계발이에요!`
      ];
      const randomMessage = lateMessages[Math.floor(Math.random() * lateMessages.length)];
      bot.sendMessage(chatId, randomMessage);
    }
    return;
  }
  
  // 근무 중 - 퇴근까지 남은 시간 표시
  const timeMessage = utils.formatTimeMessage(minutesToLeave);
  const { emoji, comment } = utils.getLeaveTimeEmoji(minutesToLeave);
  
  bot.sendMessage(chatId, `${emoji} ${userName}님의 퇴근까지 ${timeMessage} 남았습니다!${comment}`);
};

// 퇴근 시간 체크 명령어들
bot.onText(/\/퇴근$/, handleLeaveTimeCheck);
bot.onText(/\/time2leave$/, handleLeaveTimeCheck);

// 설정된 퇴근시간 확인
bot.onText(/\/퇴근시간/, (msg) => {
  const chatId = msg.chat.id;
  const userName = utils.getUserName(msg);
  
  const schedule = workSchedules[chatId];
  if (!schedule) {
    bot.sendMessage(chatId, "근무시간을 먼저 설정해주세요!\n/set_work_time 08:30 17:30");
    return;
  }
  
  const startTimeStr = `${schedule.startTime.hours.toString().padStart(2, '0')}:${schedule.startTime.minutes.toString().padStart(2, '0')}`;
  const endTimeStr = `${schedule.endTime.hours.toString().padStart(2, '0')}:${schedule.endTime.minutes.toString().padStart(2, '0')}`;
  
  const message = `
⏰ *${userName}님의 근무시간*

🌅 출근: ${startTimeStr}
🌙 퇴근: ${endTimeStr}

/퇴근 명령어로 남은 시간을 확인하세요!
  `;
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// 디버깅용 명령어 (임시)
bot.onText(/\/debug/, (msg) => {
  const chatId = msg.chat.id;
  const schedule = workSchedules[chatId];
  
  let debugInfo = "🔍 디버그 정보\n\n";
  debugInfo += `ChatID: ${chatId}\n`;
  debugInfo += `Schedule: ${schedule ? 'O' : 'X'}\n`;
  
  if (schedule) {
    debugInfo += `출근: ${schedule.startTime.hours}:${schedule.startTime.minutes}\n`;
    debugInfo += `퇴근: ${schedule.endTime.hours}:${schedule.endTime.minutes}\n`;
  }
  
  bot.sendMessage(chatId, debugInfo);
});
