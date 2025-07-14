const TelegramBot = require("node-telegram-bot-api");

// ==================== 봇 초기화 ====================
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ==================== 데이터 저장소 ====================
let todos = [];
let timers = {};
let workSchedules = {};

// ==================== 운세 데이터 ====================
const fortunes = {
  general: [
    "오늘은 새로운 기회가 찾아올 것 같아요! ✨",
    "평소보다 신중하게 결정을 내리는 것이 좋겠어요 🤔",
    "좋은 소식이 들려올 예정입니다! 📬",
    "오늘은 휴식을 취하며 에너지를 충전하세요 🔋",
    "새로운 사람과의 만남이 좋은 결과를 가져다줄 거예요 👥",
    "창의적인 아이디어가 떠오를 수 있는 날이에요 💡",
    "건강에 조금 더 신경 쓰시는 것이 좋겠어요 🏃‍♂️",
    "예상치 못한 행운이 찾아올 수도 있어요! 🍀"
  ],
  work: [
    "업무에서 좋은 성과를 거둘 수 있는 날이에요! 💼",
    "동료와의 협업이 특히 잘 풀릴 것 같아요 🤝",
    "새로운 프로젝트 제안을 받을 수 있어요 📈",
    "리더십을 발휘할 기회가 생길 거예요 👑",
    "회의나 프레젠테이션이 성공적일 예정입니다 🎯",
    "업무 효율이 평소보다 높을 것 같아요 ⚡",
    "새로운 기술이나 지식을 배울 기회가 있어요 📚"
  ],
  love: [
    "특별한 사람과 좋은 시간을 보낼 수 있어요 💕",
    "새로운 인연을 만날 가능성이 높아요 💘",
    "소중한 사람에게 마음을 전할 좋은 타이밍이에요 💌",
    "연인과의 관계가 한층 깊어질 것 같아요 💑",
    "진심 어린 대화가 관계를 개선시킬 거예요 💬"
  ],
  money: [
    "예상치 못한 수입이 생길 수 있어요! 💰",
    "투자에 대해 신중하게 고려해보세요 📊",
    "절약하는 습관이 큰 도움이 될 거예요 🐷",
    "새로운 수입원을 찾을 기회가 있어요 💡",
    "재정 계획을 다시 점검해보세요 📋"
  ],
  party: [
    "동료들과의 회식이 특히 즐거울 것 같아요 🍻",
    "새로운 팀원과 친해질 좋은 기회가 있어요 🤝",
    "상사와의 대화에서 좋은 인상을 남길 수 있어요 👔",
    "회식 자리에서 좋은 아이디어가 나올 것 같아요 💡",
    "분위기 메이커 역할을 톡톡히 해낼 거예요 🎉"
  ]
};

const luckyItems = {
  colors: ["코랄 핑크", "네이비 블루", "에메랄드 그린", "로즈 골드", "라벤더 퍼플"],
  foods: ["삼겹살", "치킨", "회", "곱창", "족발", "피자"],
  activities: ["노래방", "볼링", "당구", "술게임", "맥주 한잔"]
};

const tarotCards = [
  { name: "The Fool", meaning: "새로운 시작과 모험의 기운이 있어요", emoji: "🃏" },
  { name: "The Magician", meaning: "목표 달성을 위한 능력이 충분해요", emoji: "🎩" },
  { name: "The Star", meaning: "희망과 영감이 샘솟는 하루예요", emoji: "⭐" },
  { name: "The Sun", meaning: "긍정적인 에너지로 가득한 완벽한 날이에요", emoji: "☀️" }
];

// ==================== 유틸리티 함수 ====================
const utils = {
  getUserName: (msg) => msg.from.first_name || "님",
  
  getUserTodos: (chatId) => todos.filter(todo => todo.chatId === chatId),
  
  parseTime: (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    return { hours, minutes };
  },
  
  generateHash: (seed) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  },
  
  getFortuneScore: (userId, category = 'general') => {
    const today = new Date().toDateString();
    const seed = userId + today + category;
    const hash = utils.generateHash(seed);
    return (hash % 100) + 1;
  },
  
  getRandomFortune: (category, userId) => {
    const categoryFortunes = fortunes[category];
    if (!categoryFortunes) return "좋은 하루 되세요!";
    
    const today = new Date().toDateString();
    const seed = userId + today + category;
    const hash = utils.generateHash(seed);
    const index = hash % categoryFortunes.length;
    return categoryFortunes[index];
  },
  
  getRandomItem: (array, userId, seed = '') => {
    const today = new Date().toDateString();
    const combinedSeed = userId + today + seed;
    const hash = utils.generateHash(combinedSeed);
    const index = hash % array.length;
    return array[index];
  },
  
  getTimeToLeave: (workEndTime) => {
    const now = new Date();
    const endTime = new Date();
    endTime.setHours(workEndTime.hours, workEndTime.minutes, 0, 0);
    const diffMs = endTime - now;
    return Math.floor(diffMs / (1000 * 60));
  },
  
  formatTimeMessage: (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}시간 ${remainingMinutes}분` : `${remainingMinutes}분`;
  },
  
  getLeaveTimeEmoji: (minutes) => {
    if (minutes <= 30) return { emoji: "🎉", comment: " 거의 다 왔어요!" };
    if (minutes <= 60) return { emoji: "😊", comment: " 조금만 더!" };
    if (minutes <= 120) return { emoji: "💪", comment: " 파이팅!" };
    return { emoji: "⏰", comment: "" };
  }
};

// ==================== 퇴근 시간 체크 핸들러 ====================
const handleLeaveTimeCheck = (msg) => {
  const chatId = msg.chat.id;
  const userName = utils.getUserName(msg);
  
  const schedule = workSchedules[chatId];
  if (!schedule) {
    bot.sendMessage(chatId, "근무시간을 먼저 설정해주세요!\n/set_work_time 08:30 17:30");
    return;
  }
  
  const now = new Date();
  const currentDay = now.getDay();
  
  // 주말 체크
  if (currentDay === 0 || currentDay === 6) {
    const dayName = currentDay === 0 ? '일요일' : '토요일';
    bot.sendMessage(chatId, `${userName}님, 오늘은 ${dayName}이에요! 쉬세요~ 😊`);
    return;
  }
  
  const minutesToLeave = utils.getTimeToLeave(schedule.endTime);
  
  // 이미 퇴근 시간이 지났는지 체크
  if (minutesToLeave <= 0) {
    bot.sendMessage(chatId, `${userName}님, 이미 퇴근 시간이에요! 수고하셨습니다! 🎉`);
    return;
  }
  
  // 출근 시간 전 체크
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const startTime = schedule.startTime;
  
  if (currentHour < startTime.hours || 
     (currentHour === startTime.hours && currentMinute < startTime.minutes)) {
    bot.sendMessage(chatId, `${userName}님, 아직 출근 전이에요! ☕`);
    return;
  }
  
  const timeMessage = utils.formatTimeMessage(minutesToLeave);
  const { emoji, comment } = utils.getLeaveTimeEmoji(minutesToLeave);
  
  bot.sendMessage(chatId, `${emoji} ${userName}님의 퇴근까지 ${timeMessage} 남았습니다.${comment}`);
};

// ==================== 기본 명령어 ====================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = utils.getUserName(msg);
  
  bot.sendMessage(chatId, 
    `안녕하세요 ${userName}! 할일 관리 봇입니다.\n/help 명령어로 사용법을 확인하세요.`
  );
});

bot.onText(/\/help$/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
📋 *doomock_todoBot 사용법*

━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 *할일 관리*
/add [할일] - 새 할일 추가
/list - 할일 목록 보기
/done [번호] - 할일 완료
/delete [번호] - 할일 삭제

⏰ *시간 관리*
/timer [작업명] - 타이머 시작
/stop - 타이머 중지
/remind [분]m [내용] - 리마인더 설정
/status - 현재 상태 보기

🔮 *운세 기능*
/fortune - 오늘의 운세
/fortune_work - 업무 운세
/fortune_party - 회식 운세
/tarot - 타로카드 운세

🏢 *퇴근 관리*
/set_work_time 08:30 17:30 - 근무시간 설정
/퇴근 또는 /time2leave - 퇴근까지 남은 시간

━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *사용 예시*
\`/add 월말 보고서 작성\`
\`/timer 기획서 작성\`
\`/set_work_time 08:30 17:30\`
\`/퇴근\`
  `;
  
  bot.sendMessage(chatId, helpText, {parse_mode: 'Markdown'});
});

// ==================== 할일 관리 ====================
bot.onText(/\/add (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const todoText = match[1];

  todos.push({
    id: Date.now(),
    text: todoText,
    completed: false,
    chatId: chatId,
    createdAt: new Date(),
  });

  bot.sendMessage(chatId, `✅ 할일이 추가되었습니다: "${todoText}"`);
});

bot.onText(/\/list/, (msg) => {
  const chatId = msg.chat.id;
  const userTodos = utils.getUserTodos(chatId);

  if (userTodos.length === 0) {
    bot.sendMessage(chatId, "📝 등록된 할일이 없습니다.\n/add [할일]로 할일을 추가해보세요.");
    return;
  }

  let message = "📋 *할일 목록*\n\n";
  userTodos.forEach((todo, index) => {
    const status = todo.completed ? "✅" : "⏳";
    message += `${index + 1}. ${status} ${todo.text}\n`;
  });

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

bot.onText(/\/done (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const todoIndex = parseInt(match[1]) - 1;
  const userTodos = utils.getUserTodos(chatId);

  if (todoIndex >= 0 && todoIndex < userTodos.length) {
    userTodos[todoIndex].completed = true;
    bot.sendMessage(chatId, `✅ "${userTodos[todoIndex].text}" 완료 처리되었습니다!`);
  } else {
    bot.sendMessage(chatId, "❌ 잘못된 번호입니다. /list로 목록을 확인해주세요.");
  }
});

bot.onText(/\/delete (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const todoIndex = parseInt(match[1]) - 1;
  const userTodos = utils.getUserTodos(chatId);

  if (todoIndex >= 0 && todoIndex < userTodos.length) {
    const deletedTodo = userTodos[todoIndex];
    todos = todos.filter((todo) => todo !== deletedTodo);
    bot.sendMessage(chatId, `🗑️ "${deletedTodo.text}" 삭제되었습니다.`);
  } else {
    bot.sendMessage(chatId, "❌ 잘못된 번호입니다. /list로 목록을 확인해주세요.");
  }
});

// ==================== 시간 관리 ====================
bot.onText(/\/timer (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const taskName = match[1];

  if (timers[chatId]) {
    bot.sendMessage(chatId, "⏰ 이미 실행 중인 타이머가 있습니다. /stop으로 중지 후 다시 시도해주세요.");
    return;
  }

  timers[chatId] = {
    taskName: taskName,
    startTime: new Date(),
  };

  bot.sendMessage(chatId, `⏱️ "${taskName}" 타이머가 시작되었습니다!`);
});

bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;

  if (!timers[chatId]) {
    bot.sendMessage(chatId, "⏰ 실행 중인 타이머가 없습니다.");
    return;
  }

  const timer = timers[chatId];
  const endTime = new Date();
  const duration = Math.floor((endTime - timer.startTime) / 1000 / 60);

  delete timers[chatId];

  bot.sendMessage(chatId, `⏹️ "${timer.taskName}" 타이머 중지\n⏰ 소요시간: ${duration}분`);
});

bot.onText(/\/remind (\d+)m (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const minutes = parseInt(match[1]);
  const reminderText = match[2];

  bot.sendMessage(chatId, `⏰ ${minutes}분 후에 "${reminderText}" 알림이 설정되었습니다.`);

  setTimeout(() => {
    bot.sendMessage(chatId, `🔔 *리마인더*\n${reminderText}`, {parse_mode: "Markdown"});
  }, minutes * 60 * 1000);
});

bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const userTodos = utils.getUserTodos(chatId);
  const completedCount = userTodos.filter((todo) => todo.completed).length;
  const pendingCount = userTodos.length - completedCount;

  let message = `📊 *현재 상태*\n\n`;
  message += `📝 전체 할일: ${userTodos.length}개\n`;
  message += `✅ 완료: ${completedCount}개\n`;
  message += `⏳ 진행중: ${pendingCount}개\n\n`;

  if (timers[chatId]) {
    const runningTime = Math.floor((new Date() - timers[chatId].startTime) / 1000 / 60);
    message += `⏱️ 실행중: "${timers[chatId].taskName}" (${runningTime}분)`;
  } else {
    message += `⏰ 실행중인 타이머 없음`;
  }

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// ==================== 운세 기능 ====================
bot.onText(/\/fortune$/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = utils.getUserName(msg);
  
  const generalFortune = utils.getRandomFortune('general', userId);
  const workFortune = utils.getRandomFortune('work', userId);
  const luckyColor = utils.getRandomItem(luckyItems.colors, userId, 'color');
  const luckyNumber = Math.floor(Math.random() * 45) + 1;
  
  const message = `
🔮 *${userName}의 오늘 운세*
📅 ${new Date().toLocaleDateString('ko-KR')}

🌟 *전체 운세*
${generalFortune}

💼 *업무 운세*
${workFortune}

🍀 *행운의 컬러*: ${luckyColor}
🎲 *행운의 숫자*: ${luckyNumber}
  `;
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

bot.onText(/\/fortune_work/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = utils.getUserName(msg);
  
  const workFortune = utils.getRandomFortune('work', userId);
  const score = utils.getFortuneScore(userId, 'work');
  
  const message = `
💼 *${userName}의 업무 운세*

${workFortune}

📊 *점수*: ${score}/100
  `;
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

bot.onText(/\/fortune_party/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = utils.getUserName(msg);
  
  const partyFortune = utils.getRandomFortune('party', userId);
  const score = utils.getFortuneScore(userId, 'party');
  const luckyFood = utils.getRandomItem(luckyItems.foods, userId, 'food');
  const luckyActivity = utils.getRandomItem(luckyItems.activities, userId, 'activity');
  
  const message = `
🍻 *${userName}의 회식 운세*

${partyFortune}

📊 *점수*: ${score}/100
🍽️ *추천 메뉴*: ${luckyFood}
🎵 *추천 활동*: ${luckyActivity}

${score >= 80 ? '🎉 완벽한 회식 날이에요!' : 
  score >= 60 ? '😊 즐거운 회식이 될 것 같아요!' : 
  '🤔 오늘은 가벼운 모임 정도가 좋겠어요!'}
  `;
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

bot.onText(/\/tarot/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = utils.getUserName(msg);
  
  const tarotCard = utils.getRandomItem(tarotCards, userId, 'tarot');
  
  const message = `
🎴 *${userName}의 오늘 타로 운세*

${tarotCard.emoji} **${tarotCard.name}**

${tarotCard.meaning}

✨ 오늘 하루 이 카드의 에너지를 느끼며 보내보세요.
  `;
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// ==================== 퇴근 관리 ====================
bot.onText(/\/set_work_time (\d{1,2}:\d{2}) (\d{1,2}:\d{2})/, (msg, match) => {
  const chatId = msg.chat.id;
  const startTimeStr = match[1];
  const endTimeStr = match[2];
  
  const startTime = utils.parseTime(startTimeStr);
  const endTime = utils.parseTime(endTimeStr);
  
  if (!startTime || !endTime) {
    bot.sendMessage(chatId, "❌ 시간 형식이 올바르지 않습니다.\n사용법: /set_work_time 08:30 17:30");
    return;
  }
  
  workSchedules[chatId] = {
    startTime,
    endTime,
    enabled: true
  };
  
  const message = `
⏰ *근무 시간이 설정되었습니다!*

🌅 출근 시간: ${startTimeStr}
🌙 퇴근 시간: ${endTimeStr}

/퇴근 또는 /time2leave 명령어로 퇴근까지 남은 시간을 확인하세요!
  `;
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// 퇴근 시간 체크 (한글/영어 모두 지원)
bot.onText(/\/퇴근/, handleLeaveTimeCheck);
bot.onText(/\/time2leave/, handleLeaveTimeCheck);

bot.onText(/\/퇴근시간/, (msg) => {
  const chatId = msg.chat.id;
  const userName = utils.getUserName(msg);
  
  const schedule = workSchedules[chatId];
  if (!schedule) {
    bot.sendMessage(chatId, "근무시간을 먼저 설정해주세요!\n/set_work_time 08:30 17:30");
    return;
  }
  
  const endTimeStr = `${schedule.endTime.hours.toString().padStart(2, '0')}:${schedule.endTime.minutes.toString().padStart(2, '0')}`;
  bot.sendMessage(chatId, `${userName}님의 퇴근시간은 ${endTimeStr}입니다! 🕐`);
});

// ==================== 기타 ====================
bot.onText(/\/settings/, (msg) => {
  const chatId = msg.chat.id;
  const userName = utils.getUserName(msg);
  const userTodos = utils.getUserTodos(chatId);
  const schedule = workSchedules[chatId];
  
  let message = `⚙️ *${userName}의 봇 설정*\n\n`;
  
  // 할일 통계
  message += `📝 *할일 통계*\n`;
  message += `• 전체: ${userTodos.length}개\n`;
  message += `• 완료: ${userTodos.filter(t => t.completed).length}개\n`;
  message += `• 진행중: ${userTodos.filter(t => !t.completed).length}개\n\n`;
  
  // 근무 시간 설정
  if (schedule) {
    const startTime = `${schedule.startTime.hours.toString().padStart(2, '0')}:${schedule.startTime.minutes.toString().padStart(2, '0')}`;
    const endTime = `${schedule.endTime.hours.toString().padStart(2, '0')}:${schedule.endTime.minutes.toString().padStart(2, '0')}`;
    message += `⏰ *근무 시간*\n`;
    message += `• 출근: ${startTime}\n`;
    message += `• 퇴근: ${endTime}\n\n`;
  } else {
    message += `⏰ *근무 시간*: 미설정\n\n`;
  }
  
  // 타이머 상태
  if (timers[chatId]) {
    const runningTime = Math.floor((new Date() - timers[chatId].startTime) / 1000 / 60);
    message += `⏱️ *타이머*: "${timers[chatId].taskName}" (${runningTime}분)`;
  } else {
    message += `⏱️ *타이머*: 없음`;
  }
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// ==================== 봇 시작 ====================
console.log("🤖 doomock_todoBot이 시작되었습니다!");

bot.on("error", (error) => {
  console.log("봇 에러:", error);
});

bot.on("polling_error", (error) => {
  console.log("폴링 에러:", error);
});
