const TelegramBot = require("node-telegram-bot-api");

// ==================== 봇 설정 ====================
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ==================== 근무시간 상수 ====================
const WORK_SCHEDULE = {
  START_TIME: { hours: 8, minutes: 30 },   // 오전 8시 30분
  END_TIME: { hours: 17, minutes: 30 }     // 오후 5시 30분 (17:30)
};

// ==================== 데이터 저장소 ====================
let todos = [];
let timers = {};

// ==================== 메시지 데이터 ====================
const messages = {
  weekend: {
    sunday: [
      "🏠 {name}님, 오늘은 일요일이에요! 푹 쉬세요~",
      "😴 주말인데 왜 퇴근을 생각하고 계세요? 휴식하세요!",
      "🎮 일요일에는 취미생활을 즐겨보세요!",
      "☕ 여유로운 주말 보내시길 바라요~"
    ],
    saturday: [
      "🎉 토요일이에요! 즐거운 주말 되세요!",
      "🛒 장보기나 친구 만나기는 어떠세요?",
      "🎬 영화 보기 좋은 토요일이에요!",
      "🏃‍♂️ 운동하기 좋은 날씨네요!"
    ]
  },
  beforeWork: {
    early: [
      "☕ {name}님, 아직 출근 전이에요! 출근까지 {time} 남았어요.",
      "🌅 일찍 일어나셨네요! 여유로운 아침 {time} 즐기세요~",
      "🥐 출근 전 {time}, 맛있는 아침식사 드세요!",
      "📰 출근까지 {time} 남았어요. 뉴스라도 보실까요?"
    ],
    soon: "⏰ {name}님, 곧 출근시간이에요! {time} 후 출근 준비하세요!"
  },
  afterWork: {
    justLeft: [
      "🎉 {name}님, 퇴근하셨나요? 오늘도 수고하셨어요!",
      "🚗 퇴근길 조심히 가세요! 오늘 하루도 고생했어요!",
      "🍽️ 퇴근 후 맛있는 저녁 드세요~",
      "📱 이제 개인 시간이에요! 편안한 저녁 되세요!"
    ],
    evening: [
      "🌙 {name}님, 좋은 저녁 시간 보내고 계신가요?",
      "📺 저녁 시간이네요! 드라마나 영화 어때요?",
      "🍷 오늘 하루도 마무리! 내일도 화이팅하세요!",
      "💤 일찍 주무셔야 내일 컨디션이 좋아요~"
    ],
    late: [
      "😴 {name}님, 늦은 시간이에요! 푹 주무세요~",
      "🌙 내일을 위해 일찍 잠자리에 드세요!",
      "💤 좋은 꿈 꾸시고 내일 아침에 만나요!",
      "🛌 충분한 휴식이 최고의 자기계발이에요!"
    ]
  }
};

// ==================== 운세 데이터 ====================
const fortuneData = {
  categories: {
    general: [
      "오늘은 새로운 기회가 찾아올 것 같아요! ✨",
      "평소보다 신중하게 결정을 내리는 것이 좋겠어요 🤔",
      "좋은 소식이 들려올 예정입니다! 📬",
      "오늘은 휴식을 취하며 에너지를 충전하세요 🔋",
      "새로운 사람과의 만남이 좋은 결과를 가져다줄 거예요 👥",
      "창의적인 아이디어가 떠오를 수 있는 날이에요 💡"
    ],
    work: [
      "업무에서 좋은 성과를 거둘 수 있는 날이에요! 💼",
      "동료와의 협업이 특히 잘 풀릴 것 같아요 🤝",
      "새로운 프로젝트 제안을 받을 수 있어요 📈",
      "리더십을 발휘할 기회가 생길 거예요 👑",
      "회의나 프레젠테이션이 성공적일 예정입니다 🎯"
    ],
    love: [
      "특별한 사람과 좋은 시간을 보낼 수 있어요 💕",
      "새로운 인연을 만날 가능성이 높아요 💘",
      "소중한 사람에게 마음을 전할 좋은 타이밍이에요 💌",
      "연인과의 관계가 한층 깊어질 것 같아요 💑"
    ],
    party: [
      "동료들과의 회식이 특히 즐거울 것 같아요 🍻",
      "새로운 팀원과 친해질 좋은 기회가 있어요 🤝",
      "상사와의 대화에서 좋은 인상을 남길 수 있어요 👔",
      "회식 자리에서 좋은 아이디어가 나올 것 같아요 💡"
    ]
  },
  items: {
    colors: ["코랄 핑크", "네이비 블루", "에메랄드 그린", "로즈 골드", "라벤더 퍼플"],
    foods: ["삼겹살", "치킨", "회", "곱창", "족발", "피자"],
    activities: ["노래방", "볼링", "당구", "술게임", "맥주 한잔"]
  },
  tarot: [
    { name: "The Fool", meaning: "새로운 시작과 모험의 기운이 있어요", emoji: "🃏" },
    { name: "The Magician", meaning: "목표 달성을 위한 능력이 충분해요", emoji: "🎩" },
    { name: "The Star", meaning: "희망과 영감이 샘솟는 하루예요", emoji: "⭐" },
    { name: "The Sun", meaning: "긍정적인 에너지로 가득한 완벽한 날이에요", emoji: "☀️" }
  ]
};

// ==================== 메뉴 데이터 ====================
const menuData = {
  todo: {
    title: "📝 할일 관리",
    commands: [
      { cmd: "/add [할일]", desc: "새 할일 추가" },
      { cmd: "/list", desc: "할일 목록 보기" },
      { cmd: "/done [번호]", desc: "할일 완료 처리" },
      { cmd: "/delete [번호]", desc: "할일 삭제" }
    ]
  },
  time: {
    title: "⏰ 시간 관리",
    commands: [
      { cmd: "/timer [작업명]", desc: "타이머 시작" },
      { cmd: "/stop", desc: "타이머 중지" },
      { cmd: "/remind [분]m [내용]", desc: "리마인더 설정" },
      { cmd: "/status", desc: "현재 상태 확인" }
    ]
  },
  work: {
    title: "🏢 퇴근 관리",
    commands: [
      { cmd: "/퇴근", desc: "퇴근까지 남은 시간" },
      { cmd: "/time2leave", desc: "퇴근까지 남은 시간 (영어)" },
      { cmd: "/퇴근시간", desc: "근무시간 확인" }
    ]
  },
  fortune: {
    title: "🔮 운세 기능",
    commands: [
      { cmd: "/fortune", desc: "오늘의 종합 운세" },
      { cmd: "/fortune_work", desc: "업무 운세" },
      { cmd: "/fortune_party", desc: "회식 운세" },
      { cmd: "/tarot", desc: "타로카드 운세" }
    ]
  }
};

// ==================== 유틸리티 클래스 ====================
class BotUtils {
  static getUserName(msg) {
    return msg.from.first_name || "님";
  }

  static getUserTodos(chatId) {
    return todos.filter(todo => todo.chatId === chatId);
  }

  static parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    return { hours, minutes };
  }

  static generateHash(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  static getRandomFromArray(array, userId, category = '') {
    const today = new Date().toDateString();
    const seed = userId + today + category;
    const hash = this.generateHash(seed);
    return array[hash % array.length];
  }

  static getFortuneScore(userId, category = 'general') {
    const today = new Date().toDateString();
    const seed = userId + today + category;
    const hash = this.generateHash(seed);
    return (hash % 100) + 1;
  }

  static formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}시간 ${remainingMinutes}분` : `${remainingMinutes}분`;
  }

  static getRandomMessage(messageArray, replacements = {}) {
    const message = this.getRandomFromArray(messageArray, replacements.userId || Date.now());
    return this.replaceMessagePlaceholders(message, replacements);
  }

  static replaceMessagePlaceholders(message, replacements) {
    let result = message;
    Object.keys(replacements).forEach(key => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), replacements[key]);
    });
    return result;
  }

  static getTimeToLeave(endTime) {
    const now = new Date();
    const endDateTime = new Date();
    endDateTime.setHours(endTime.hours, endTime.minutes, 0, 0);
    const diffMs = endDateTime - now;
    return Math.floor(diffMs / (1000 * 60));
  }

  static getLeaveTimeEmoji(minutes) {
    if (minutes <= 30) return { emoji: "🎉", comment: " 거의 다 왔어요!" };
    if (minutes <= 60) return { emoji: "😊", comment: " 조금만 더!" };
    if (minutes <= 120) return { emoji: "💪", comment: " 파이팅!" };
    return { emoji: "⏰", comment: "" };
  }
}

// ==================== 메뉴 관리 클래스 ====================
class MenuManager {
  static createMainMenu() {
    let menu = "🤖 *doomock_todoBot 메뉴*\n\n";
    menu += "원하는 카테고리를 선택해주세요:\n\n";
    
    Object.keys(menuData).forEach(key => {
      const category = menuData[key];
      menu += `${category.title}\n`;
      menu += `/menu_${key}\n\n`;
    });
    
    menu += "💡 *빠른 시작*\n";
    menu += "/add 할일내용 - 바로 할일 추가\n";
    menu += "/퇴근 - 바로 퇴근시간 확인\n";
    menu += "/fortune - 바로 운세 확인";
    
    return menu;
  }

  static createCategoryMenu(categoryKey) {
    const category = menuData[categoryKey];
    if (!category) return "❌ 존재하지 않는 카테고리입니다.";
    
    let menu = `${category.title}\n\n`;
    
    category.commands.forEach(command => {
      menu += `${command.cmd}\n`;
      menu += `↳ ${command.desc}\n\n`;
    });
    
    menu += "📋 /menu - 메인 메뉴로 돌아가기";
    return menu;
  }
}

// ==================== 퇴근 관리 클래스 ====================
class WorkTimeManager {
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

    const startTime = WORK_SCHEDULE.START_TIME;
    const endTime = WORK_SCHEDULE.END_TIME;

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

// ==================== 운세 관리 클래스 ====================
class FortuneManager {
  static getBasicFortune(userId, userName) {
    const generalFortune = BotUtils.getRandomFromArray(fortuneData.categories.general, userId, 'general');
    const workFortune = BotUtils.getRandomFromArray(fortuneData.categories.work, userId, 'work');
    const luckyColor = BotUtils.getRandomFromArray(fortuneData.items.colors, userId, 'color');
    const luckyNumber = (BotUtils.generateHash(userId + new Date().toDateString()) % 45) + 1;
    
    return `
🔮 *${userName}의 오늘 운세*
📅 ${new Date().toLocaleDateString('ko-KR')}

🌟 *전체 운세*
${generalFortune}

💼 *업무 운세*
${workFortune}

🍀 *행운의 컬러*: ${luckyColor}
🎲 *행운의 숫자*: ${luckyNumber}
    `;
  }

  static getCategoryFortune(category, userId, userName) {
    const fortune = BotUtils.getRandomFromArray(fortuneData.categories[category], userId, category);
    const score = BotUtils.getFortuneScore(userId, category);
    
    const categoryEmojis = {
      work: "💼",
      party: "🍻",
      love: "💕"
    };

    let message = `
${categoryEmojis[category]} *${userName}의 ${category === 'work' ? '업무' : category === 'party' ? '회식' : '연애'} 운세*

${fortune}

📊 *점수*: ${score}/100
    `;

    if (category === 'party') {
      const luckyFood = BotUtils.getRandomFromArray(fortuneData.items.foods, userId, 'food');
      const luckyActivity = BotUtils.getRandomFromArray(fortuneData.items.activities, userId, 'activity');
      
      message += `🍽️ *추천 메뉴*: ${luckyFood}\n`;
      message += `🎵 *추천 활동*: ${luckyActivity}\n\n`;
      message += score >= 80 ? '🎉 완벽한 회식 날이에요!' : 
                 score >= 60 ? '😊 즐거운 회식이 될 것 같아요!' : 
                 '🤔 오늘은 가벼운 모임 정도가 좋겠어요!';
    }

    return message;
  }

  static getTarotFortune(userId, userName) {
    const tarotCard = BotUtils.getRandomFromArray(fortuneData.tarot, userId, 'tarot');
    
    return `
🎴 *${userName}의 오늘 타로 운세*

${tarotCard.emoji} **${tarotCard.name}**

${tarotCard.meaning}

✨ 오늘 하루 이 카드의 에너지를 느끼며 보내보세요.
    `;
  }
}

// ==================== 봇 명령어 핸들러 ====================

// 기본 명령어
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = BotUtils.getUserName(msg);
  
  bot.sendMessage(chatId, 
    `안녕하세요 ${userName}! 할일 관리 봇입니다.\n/menu 명령어로 메뉴를 확인하세요.`
  );
});

bot.onText(/\/help$/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
📋 *doomock_todoBot 사용법*

━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *빠른 시작*
/menu - 📱 카테고리별 메뉴 (추천!)
/add 할일내용 - 📝 바로 할일 추가
/퇴근 - 🏃‍♂️ 바로 퇴근시간 확인
/fortune - 🔮 바로 운세 확인

━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ *근무시간*
출근: 08:30 | 퇴근: 17:30 (고정)

💡 *주요 기능*
• 할일 관리와 타이머
• 퇴근까지 남은 시간 체크
• 매일 다른 운세와 타로카드

🎯 /menu 명령어를 사용하면 더 편리해요!
  `;
  
  bot.sendMessage(chatId, helpText, {parse_mode: 'Markdown'});
});

// 메뉴 명령어
bot.onText(/\/menu$/, (msg) => {
  const chatId = msg.chat.id;
  const menuText = MenuManager.createMainMenu();
  bot.sendMessage(chatId, menuText, {parse_mode: 'Markdown'});
});

['todo', 'time', 'work', 'fortune'].forEach(category => {
  bot.onText(new RegExp(`\\/menu_${category}`), (msg) => {
    const chatId = msg.chat.id;
    const menuText = MenuManager.createCategoryMenu(category);
    bot.sendMessage(chatId, menuText, {parse_mode: 'Markdown'});
  });
});

// 할일 관리
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
  const userTodos = BotUtils.getUserTodos(chatId);

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
  const userTodos = BotUtils.getUserTodos(chatId);

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
  const userTodos = BotUtils.getUserTodos(chatId);

  if (todoIndex >= 0 && todoIndex < userTodos.length) {
    const deletedTodo = userTodos[todoIndex];
    todos = todos.filter((todo) => todo !== deletedTodo);
    bot.sendMessage(chatId, `🗑️ "${deletedTodo.text}" 삭제되었습니다.`);
  } else {
    bot.sendMessage(chatId, "❌ 잘못된 번호입니다. /list로 목록을 확인해주세요.");
  }
});

// 시간 관리
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
  const userTodos = BotUtils.getUserTodos(chatId);
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

// 퇴근 관리
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
  
  if (!startTime || !endTime) {
    bot.sendMessage(chatId, "❌ 올바른 시간을 입력해주세요\n예시: /set_work_time 08:30 17:30");
    return;
  }
  
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

bot.onText(/\/퇴근$/, (msg) => WorkTimeManager.handleLeaveTimeCheck(msg));
bot.onText(/\/time2leave$/, (msg) => WorkTimeManager.handleLeaveTimeCheck(msg));

bot.onText(/\/퇴근시간/, (msg) => {
  const chatId = msg.chat.id;
  const userName = BotUtils.getUserName(msg);
  
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

// 운세 기능
bot.onText(/\/fortune$/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = BotUtils.getUserName(msg);
  
  const fortuneText = FortuneManager.getBasicFortune(userId, userName);
  bot.sendMessage(chatId, fortuneText, {parse_mode: 'Markdown'});
});

bot.onText(/\/fortune_work/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = BotUtils.getUserName(msg);
  
  const fortuneText = FortuneManager.getCategoryFortune('work', userId, userName);
  bot.sendMessage(chatId, fortuneText, {parse_mode: 'Markdown'});
});

bot.onText(/\/fortune_party/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = BotUtils.getUserName(msg);
  
  const fortuneText = FortuneManager.getCategoryFortune('party', userId, userName);
  bot.sendMessage(chatId, fortuneText, {parse_mode: 'Markdown'});
});

bot.onText(/\/tarot/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = BotUtils.getUserName(msg);
  
  const fortuneText = FortuneManager.getTarotFortune(userId, userName);
  bot.sendMessage(chatId, fortuneText, {parse_mode: 'Markdown'});
});

// 설정
bot.onText(/\/settings/, (msg) => {
  const chatId = msg.chat.id;
  const userName = BotUtils.getUserName(msg);
  const userTodos = BotUtils.getUserTodos(chatId);
  const { startTimeStr, endTimeStr } = WorkTimeManager.getWorkScheduleInfo();
  
  let message = `⚙️ *${userName}의 봇 설정*\n\n`;
  
  // 할일 통계
  message += `📝 *할일 통계*\n`;
  message += `• 전체: ${userTodos.length}개\n`;
  message += `• 완료: ${userTodos.filter(t => t.completed).length}개\n`;
  message += `• 진행중: ${userTodos.filter(t => !t.completed).length}개\n\n`;
  
  // 근무 시간 (고정)
  message += `⏰ *근무 시간* (고정)\n`;
  message += `• 출근: ${startTimeStr}\n`;
  message += `• 퇴근: ${endTimeStr}\n\n`;
  
  // 타이머 상태
  if (timers[chatId]) {
    const runningTime = Math.floor((new Date() - timers[chatId].startTime) / 1000 / 60);
    message += `⏱️ *타이머*: "${timers[chatId].taskName}" (${runningTime}분)`;
  } else {
    message += `⏱️ *타이머*: 없음`;
  }
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// 디버그 (개발용)
bot.onText(/\/debug/, (msg) => {
  const chatId = msg.chat.id;
  const { startTimeStr, endTimeStr } = WorkTimeManager.getWorkScheduleInfo();
  
  let debugInfo = "🔍 디버그 정보\n\n";
  debugInfo += `ChatID: ${chatId}\n`;
  debugInfo += `근무시간: ${startTimeStr} ~ ${endTimeStr} (고정)\n`;
  debugInfo += `현재시간: ${new Date().toLocaleTimeString('ko-KR')}\n`;
  
  bot.sendMessage(chatId, debugInfo);
});

// ==================== 봇 시작 ====================
console.log("🤖 doomock_todoBot v2 시작되었습니다!");

bot.on("error", (error) => {
  console.log("봇 에러:", error);
});

bot.on("polling_error", (error) => {
  console.log("폴링 에러:", error);
});Str.includes(':') || !endTimeStr.includes(':')) {
    bot.sendMessage(chatId, "❌ 시간 형식: HH:MM\n예시: /set_work_time 08:30 17:30");
    return;
  }
  
  const startTime = BotUtils.parseTime(startTimeStr);
  const endTime = BotUtils.parseTime(endTimeStr);
  
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
