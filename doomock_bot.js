const TelegramBot = require("node-telegram-bot-api");

// ==================== 환경설정 ====================
const CONFIG = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  DEFAULT_WORK_HOURS: {
    START: { hours: 8, minutes: 30 },
    END: { hours: 17, minutes: 30 }
  }
};

// ==================== 봇 초기화 ====================
const bot = new TelegramBot(CONFIG.BOT_TOKEN, { polling: true });

// ==================== 데이터 저장소 ====================
const storage = {
  todos: new Map(),        // chatId -> todo 배열
  timers: new Map(),       // chatId -> timer 객체
  workSchedules: new Map() // chatId -> 개인 근무시간
};

// ==================== 메시지 템플릿 ====================
const MESSAGES = {
  weekend: {
    sunday: [
      "🏠 {name}님, 일요일엔 푹 쉬세요~",
      "😴 주말에 왜 퇴근을 생각하세요? 휴식하세요!",
      "🎮 일요일엔 취미생활을 즐겨보세요!"
    ],
    saturday: [
      "🎉 토요일이에요! 즐거운 주말 되세요!",
      "🛒 장보기나 친구 만나기는 어떠세요?",
      "🎬 영화 보기 좋은 토요일이에요!"
    ]
  },
  work: {
    beforeWork: [
      "☕ {name}님, 출근까지 {time} 남았어요!",
      "🌅 여유로운 아침 {time} 즐기세요~"
    ],
    soon: "⏰ {name}님, 곧 출근시간이에요! {time} 후 출근 준비하세요!",
    afterWork: [
      "🎉 {name}님, 퇴근하셨나요? 오늘도 수고하셨어요!",
      "🚗 퇴근길 조심히 가세요!"
    ],
    evening: [
      "🌙 {name}님, 좋은 저녁 되세요!",
      "📺 저녁 시간이네요! 드라마는 어때요?"
    ],
    late: [
      "😴 {name}님, 늦은 시간이에요! 푹 주무세요~",
      "💤 좋은 꿈 꾸세요!"
    ]
  }
};

// ==================== 운세 데이터 ====================
const FORTUNE_DATA = {
  general: [
    "오늘은 새로운 기회가 찾아올 것 같아요! ✨",
    "좋은 소식이 들려올 예정입니다! 📬",
    "창의적인 아이디어가 떠오를 수 있는 날이에요 💡"
  ],
  work: [
    "업무에서 좋은 성과를 거둘 수 있는 날이에요! 💼",
    "동료와의 협업이 특히 잘 풀릴 것 같아요 🤝",
    "새로운 프로젝트 제안을 받을 수 있어요 📈"
  ],
  party: [
    "동료들과의 회식이 특히 즐거울 것 같아요 🍻",
    "회식 자리에서 좋은 아이디어가 나올 것 같아요 💡"
  ],
  tarot: [
    { name: "The Fool", meaning: "새로운 시작과 모험의 기운", emoji: "🃏" },
    { name: "The Star", meaning: "희망과 영감이 샘솟는 하루", emoji: "⭐" },
    { name: "The Sun", meaning: "긍정적인 에너지로 가득한 완벽한 날", emoji: "☀️" }
  ],
  colors: ["코랄 핑크", "네이비 블루", "에메랄드 그린", "로즈 골드"],
  foods: ["삼겹살", "치킨", "회", "곱창", "족발", "피자"],
  activities: ["노래방", "볼링", "당구", "술게임", "맥주 한잔"]
};

// ==================== 유틸리티 클래스 ====================
class Utils {
  static getUserName(msg) {
    return msg.from.first_name || "사용자";
  }

  static parseTime(timeStr) {
    if (!timeStr || !timeStr.includes(":")) return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return { hours, minutes };
  }

  static timeToMinutes(timeObj) {
    return timeObj.hours * 60 + timeObj.minutes;
  }

  static formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}시간 ${remainingMinutes}분` : `${remainingMinutes}분`;
  }

  static formatTimeString(timeObj) {
    return `${timeObj.hours.toString().padStart(2, "0")}:${timeObj.minutes.toString().padStart(2, "0")}`;
  }

  static generateHash(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  static getRandomFromArray(array, userId, category = "") {
    const today = new Date().toDateString();
    const seed = `${userId}-${today}-${category}`;
    const hash = this.generateHash(seed);
    return array[hash % array.length];
  }

  static replacePlaceholders(message, replacements = {}) {
    let result = message;
    Object.keys(replacements).forEach(key => {
      result = result.replace(new RegExp(`{${key}}`, "g"), replacements[key]);
    });
    return result;
  }

  static getRandomMessage(messageArray, replacements = {}) {
    const message = this.getRandomFromArray(messageArray, replacements.userId || Date.now());
    return this.replacePlaceholders(message, replacements);
  }
}

// ==================== 할일 관리 클래스 ====================
class TodoManager {
  static getUserTodos(chatId) {
    return storage.todos.get(chatId) || [];
  }

  static addTodo(chatId, text) {
    const todos = this.getUserTodos(chatId);
    const newTodo = {
      id: Date.now(),
      text: text,
      completed: false,
      createdAt: new Date()
    };
    todos.push(newTodo);
    storage.todos.set(chatId, todos);
    return newTodo;
  }

  static completeTodo(chatId, index) {
    const todos = this.getUserTodos(chatId);
    if (index >= 0 && index < todos.length && !todos[index].completed) {
      todos[index].completed = true;
      storage.todos.set(chatId, todos);
      return todos[index];
    }
    return null;
  }

  static deleteTodo(chatId, index) {
    const todos = this.getUserTodos(chatId);
    if (index >= 0 && index < todos.length) {
      const deleted = todos.splice(index, 1)[0];
      storage.todos.set(chatId, todos);
      return deleted;
    }
    return null;
  }

  static getTodoStats(chatId) {
    const todos = this.getUserTodos(chatId);
    return {
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      pending: todos.filter(t => !t.completed).length
    };
  }

  static clearCompleted(chatId) {
    const todos = this.getUserTodos(chatId);
    const completed = todos.filter(t => t.completed);
    const remaining = todos.filter(t => !t.completed);
    storage.todos.set(chatId, remaining);
    return completed.length;
  }
}

// ==================== 시간 관리 클래스 ====================
class TimerManager {
  static startTimer(chatId, taskName) {
    if (storage.timers.has(chatId)) {
      return false; // 이미 실행 중
    }
    storage.timers.set(chatId, {
      taskName: taskName,
      startTime: new Date()
    });
    return true;
  }

  static stopTimer(chatId) {
    const timer = storage.timers.get(chatId);
    if (!timer) return null;
    
    const duration = Math.floor((new Date() - timer.startTime) / 1000 / 60);
    storage.timers.delete(chatId);
    return { ...timer, duration };
  }

  static getTimerStatus(chatId) {
    const timer = storage.timers.get(chatId);
    if (!timer) return null;
    
    const runningTime = Math.floor((new Date() - timer.startTime) / 1000 / 60);
    return { ...timer, runningTime };
  }
}

// ==================== 근무시간 관리 클래스 (v3 버전) ====================
class WorkTimeManager {
  static getWorkSchedule(chatId) {
    return storage.workSchedules.get(chatId) || {
      startTime: CONFIG.DEFAULT_WORK_HOURS.START,
      endTime: CONFIG.DEFAULT_WORK_HOURS.END,
      isDefault: true
    };
  }

  static setWorkSchedule(chatId, startTime, endTime) {
    storage.workSchedules.set(chatId, {
      startTime: startTime,
      endTime: endTime,
      isDefault: false
    });
    return true;
  }

  static resetWorkSchedule(chatId) {
    if (storage.workSchedules.has(chatId)) {
      storage.workSchedules.delete(chatId);
      return true;
    }
    return false;
  }

  static getCurrentWorkStatus(chatId) {
    const now = new Date();
    const currentDay = now.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 주말 체크
    if (currentDay === 0 || currentDay === 6) {
      return { 
        status: 'weekend', 
        dayType: currentDay === 0 ? 'sunday' : 'saturday' 
      };
    }

    const schedule = this.getWorkSchedule(chatId);
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const startTimeInMinutes = schedule.startTime.hours * 60 + schedule.startTime.minutes;
    const endTimeInMinutes = schedule.endTime.hours * 60 + schedule.endTime.minutes;
    
    // 오전 7시 (420분) 기준
    const morningStartMinutes = 7 * 60; // 7:00 AM = 420분

    // 디버그를 위한 정보
    console.log(`현재시간: ${currentHour}:${currentMinute.toString().padStart(2, '0')} (${currentTimeInMinutes}분)`);
    console.log(`퇴근시간: ${schedule.endTime.hours}:${schedule.endTime.minutes.toString().padStart(2, '0')} (${endTimeInMinutes}분)`);
    console.log(`출근시간: ${schedule.startTime.hours}:${schedule.startTime.minutes.toString().padStart(2, '0')} (${startTimeInMinutes}분)`);

    // 🌙 퇴근 후 ~ 다음날 오전 7시: 특별 메시지
    if (currentTimeInMinutes >= endTimeInMinutes || currentTimeInMinutes < morningStartMinutes) {
      return { 
        status: 'afterWork',
        message: '회사 생각한다고 월급 더 주는 거 아닙니다.'
      };
    }

    // 🌅 오전 7시 ~ 출근시간: 출근까지 카운트다운
    if (currentTimeInMinutes >= morningStartMinutes && currentTimeInMinutes < startTimeInMinutes) {
      const minutesToWork = startTimeInMinutes - currentTimeInMinutes;
      return { 
        status: 'beforeWork', 
        minutesToWork,
        isSoon: minutesToWork <= 30
      };
    }

    // 💼 근무 중: 퇴근까지 시간
    if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) {
      const minutesToLeave = endTimeInMinutes - currentTimeInMinutes;
      return { 
        status: 'working', 
        minutesToLeave 
      };
    }

    // 예외 상황 (여기에 도달하면 안 됨)
    return { 
      status: 'unknown',
      message: '시간 계산 오류가 발생했습니다.'
    };
  }

  static getLeaveMessage(chatId, userName, userId) {
    const workStatus = this.getCurrentWorkStatus(chatId);
    
    switch (workStatus.status) {
      case 'weekend':
        return Utils.getRandomMessage(
          MESSAGES.weekend[workStatus.dayType], 
          { name: userName, userId }
        );

      case 'afterWork':
        // 🌙 퇴근 후 특별 메시지
        return `🌙 ${workStatus.message}`;

      case 'beforeWork':
        // 🌅 출근까지 카운트다운
        const timeMessage = Utils.formatTime(workStatus.minutesToWork);
        if (workStatus.isSoon) {
          return `⏰ ${userName}님, 곧 출근시간이에요! 출근까지 ${timeMessage}!`;
        }
        return `🌅 ${userName}님, 출근까지 ${timeMessage}!`;

      case 'working':
        // 💼 근무 중 - 퇴근까지 시간
        const remainingTime = Utils.formatTime(workStatus.minutesToLeave);
        const emoji = workStatus.minutesToLeave <= 30 ? "🎉" : 
                     workStatus.minutesToLeave <= 60 ? "😊" : 
                     workStatus.minutesToLeave <= 120 ? "💪" : "⏰";
        const comment = workStatus.minutesToLeave <= 30 ? " 거의 다 왔어요!" :
                       workStatus.minutesToLeave <= 60 ? " 조금만 더!" :
                       workStatus.minutesToLeave <= 120 ? " 파이팅!" : "";
        
        return `${emoji} ${userName}님의 퇴근까지 ${remainingTime} 남았습니다!${comment}`;

      default:
        return workStatus.message || "❌ 시간 계산 중 오류가 발생했습니다.";
    }
  }

  static getDebugInfo(chatId) {
    const now = new Date();
    const schedule = this.getWorkSchedule(chatId);
    const workStatus = this.getCurrentWorkStatus(chatId);
    
    return {
      currentTime: Utils.formatTimeString({ 
        hours: now.getHours(), 
        minutes: now.getMinutes() 
      }),
      workHours: `${Utils.formatTimeString(schedule.startTime)} ~ ${Utils.formatTimeString(schedule.endTime)}`,
      isDefault: schedule.isDefault,
      status: workStatus.status,
      details: workStatus,
      
      // 추가 디버그 정보
      currentTimeInMinutes: now.getHours() * 60 + now.getMinutes(),
      endTimeInMinutes: schedule.endTime.hours * 60 + schedule.endTime.minutes,
      startTimeInMinutes: schedule.startTime.hours * 60 + schedule.startTime.minutes,
      morningStartMinutes: 7 * 60, // 오전 7시
      
      // 시간 범위 체크
      isAfterWork: (now.getHours() * 60 + now.getMinutes()) >= (schedule.endTime.hours * 60 + schedule.endTime.minutes),
      isBeforeMorning: (now.getHours() * 60 + now.getMinutes()) < (7 * 60),
      isWorkingHours: (now.getHours() * 60 + now.getMinutes()) >= (schedule.startTime.hours * 60 + schedule.startTime.minutes) && 
                      (now.getHours() * 60 + now.getMinutes()) < (schedule.endTime.hours * 60 + schedule.endTime.minutes)
    };
  }
}

// ==================== 운세 관리 클래스 ====================
class FortuneManager {
  static getBasicFortune(userId, userName) {
    const general = Utils.getRandomFromArray(FORTUNE_DATA.general, userId, "general");
    const work = Utils.getRandomFromArray(FORTUNE_DATA.work, userId, "work");
    const color = Utils.getRandomFromArray(FORTUNE_DATA.colors, userId, "color");
    const number = (Utils.generateHash(`${userId}-${new Date().toDateString()}`) % 45) + 1;

    return `🔮 *${userName}의 오늘 운세*
📅 ${new Date().toLocaleDateString("ko-KR")}

🌟 *전체 운세*
${general}

💼 *업무 운세*
${work}

🍀 *행운의 컬러*: ${color}
🎲 *행운의 숫자*: ${number}`;
  }

  static getCategoryFortune(category, userId, userName) {
    const fortune = Utils.getRandomFromArray(FORTUNE_DATA[category], userId, category);
    const score = (Utils.generateHash(`${userId}-${new Date().toDateString()}-${category}`) % 100) + 1;
    
    const emojis = { work: "💼", party: "🍻" };
    const names = { work: "업무", party: "회식" };

    let message = `${emojis[category]} *${userName}의 ${names[category]} 운세*

${fortune}

📊 *점수*: ${score}/100`;

    if (category === 'party') {
      const food = Utils.getRandomFromArray(FORTUNE_DATA.foods, userId, "food");
      const activity = Utils.getRandomFromArray(FORTUNE_DATA.activities, userId, "activity");
      
      message += `

🍽️ *추천 메뉴*: ${food}
🎵 *추천 활동*: ${activity}

${score >= 80 ? "🎉 완벽한 회식 날이에요!" : 
  score >= 60 ? "😊 즐거운 회식이 될 것 같아요!" : 
  "🤔 오늘은 가벼운 모임 정도가 좋겠어요!"}`;
    }

    return message;
  }

  static getTarotFortune(userId, userName) {
    const card = Utils.getRandomFromArray(FORTUNE_DATA.tarot, userId, "tarot");
    
    return `🎴 *${userName}의 오늘 타로 운세*

${card.emoji} **${card.name}**

${card.meaning}

✨ 오늘 하루 이 카드의 에너지를 느끼며 보내보세요.`;
  }
}

// ==================== 메뉴 관리 클래스 ====================
class MenuManager {
  static getMainMenu() {
    return `🤖 *doomock_todoBot v3*

📝 **할일 관리**
/add [할일] - 할일 추가
/list - 할일 목록
/done [번호] - 완료 처리
/delete [번호] - 할일 삭제

⏰ **시간 관리**
/timer [작업명] - 타이머 시작
/stop - 타이머 중지
/remind [분]m [내용] - 리마인더

🏢 **퇴근 관리**
/퇴근 - 퇴근시간 체크
/퇴근시간 - 근무시간 확인
/set_work_time [시작] [끝] - 개인 근무시간 설정

🔮 **운세 기능**
/fortune - 오늘의 종합 운세
/fortune_work - 업무 운세
/fortune_party - 회식 운세
/tarot - 타로카드

⚙️ **기타**
/status - 현재 상태
/debug - 디버그 정보
/help - 도움말`;
  }
}

// ==================== 봇 명령어 핸들러 ====================

// 기본 명령어
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = Utils.getUserName(msg);
  bot.sendMessage(chatId, `안녕하세요 ${userName}님! 할일 관리 봇입니다.\n/menu로 메뉴를 확인하세요.`);
});

bot.onText(/\/menu|\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, MenuManager.getMainMenu(), { parse_mode: "Markdown" });
});

// 할일 관리
bot.onText(/\/add (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const todoText = match[1];
  const todo = TodoManager.addTodo(chatId, todoText);
  bot.sendMessage(chatId, `✅ 할일이 추가되었습니다: "${todo.text}"`);
});

bot.onText(/\/list/, (msg) => {
  const chatId = msg.chat.id;
  const todos = TodoManager.getUserTodos(chatId);
  
  if (todos.length === 0) {
    bot.sendMessage(chatId, "📝 등록된 할일이 없습니다.\n/add [할일]로 할일을 추가해보세요.");
    return;
  }

  let message = "📋 *할일 목록*\n\n";
  todos.forEach((todo, index) => {
    const status = todo.completed ? "✅" : "⏳";
    message += `${index + 1}. ${status} ${todo.text}\n`;
  });

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

bot.onText(/\/done (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const index = parseInt(match[1]) - 1;
  const todo = TodoManager.completeTodo(chatId, index);
  
  if (todo) {
    bot.sendMessage(chatId, `✅ "${todo.text}" 완료 처리되었습니다!`);
  } else {
    bot.sendMessage(chatId, "❌ 잘못된 번호이거나 이미 완료된 할일입니다.");
  }
});

bot.onText(/\/delete (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const index = parseInt(match[1]) - 1;
  const todo = TodoManager.deleteTodo(chatId, index);
  
  if (todo) {
    bot.sendMessage(chatId, `🗑️ "${todo.text}" 삭제되었습니다.`);
  } else {
    bot.sendMessage(chatId, "❌ 잘못된 번호입니다.");
  }
});

bot.onText(/\/clear_completed/, (msg) => {
  const chatId = msg.chat.id;
  const count = TodoManager.clearCompleted(chatId);
  
  if (count > 0) {
    bot.sendMessage(chatId, `🗑️ 완료된 할일 ${count}개가 삭제되었습니다.`);
  } else {
    bot.sendMessage(chatId, "❌ 완료된 할일이 없습니다.");
  }
});

// 시간 관리
bot.onText(/\/timer (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const taskName = match[1];
  
  if (TimerManager.startTimer(chatId, taskName)) {
    bot.sendMessage(chatId, `⏱️ "${taskName}" 타이머가 시작되었습니다!`);
  } else {
    bot.sendMessage(chatId, "⏰ 이미 실행 중인 타이머가 있습니다. /stop으로 중지 후 다시 시도해주세요.");
  }
});

bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  const result = TimerManager.stopTimer(chatId);
  
  if (result) {
    bot.sendMessage(chatId, `⏹️ "${result.taskName}" 타이머 중지\n⏰ 소요시간: ${result.duration}분`);
  } else {
    bot.sendMessage(chatId, "⏰ 실행 중인 타이머가 없습니다.");
  }
});

bot.onText(/\/remind (\d+)m (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const minutes = parseInt(match[1]);
  const reminderText = match[2];

  bot.sendMessage(chatId, `⏰ ${minutes}분 후에 "${reminderText}" 알림이 설정되었습니다.`);

  setTimeout(() => {
    bot.sendMessage(chatId, `🔔 *리마인더*\n${reminderText}`, { parse_mode: "Markdown" });
  }, minutes * 60 * 1000);
});

// 근무시간 관리
bot.onText(/\/퇴근$|\/time2leave$/, (msg) => {
  const chatId = msg.chat.id;
  const userName = Utils.getUserName(msg);
  const userId = msg.from.id;
  
  const message = WorkTimeManager.getLeaveMessage(chatId, userName, userId);
  bot.sendMessage(chatId, message);
});

bot.onText(/\/퇴근시간/, (msg) => {
  const chatId = msg.chat.id;
  const userName = Utils.getUserName(msg);
  const schedule = WorkTimeManager.getWorkSchedule(chatId);
  
  const startStr = Utils.formatTimeString(schedule.startTime);
  const endStr = Utils.formatTimeString(schedule.endTime);
  const type = schedule.isDefault ? "(기본 설정)" : "(개인 설정)";
  
  const message = `⏰ *${userName}님의 근무시간* ${type}

🌅 출근: ${startStr}
🌙 퇴근: ${endStr}

/퇴근 명령어로 남은 시간을 확인하세요!`;

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

bot.onText(/\/set_work_time (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userName = Utils.getUserName(msg);
  const startTimeStr = match[1];
  const endTimeStr = match[2];

  const startTime = Utils.parseTime(startTimeStr);
  const endTime = Utils.parseTime(endTimeStr);

  if (!startTime || !endTime) {
    bot.sendMessage(chatId, "❌ 올바른 시간 형식을 입력해주세요\n예시: /set_work_time 08:30 17:30");
    return;
  }

  if (Utils.timeToMinutes(startTime) >= Utils.timeToMinutes(endTime)) {
    bot.sendMessage(chatId, "❌ 퇴근 시간은 출근 시간보다 늦어야 합니다!");
    return;
  }

  WorkTimeManager.setWorkSchedule(chatId, startTime, endTime);

  const message = `✅ *${userName}님의 근무 시간이 설정되었습니다!*

🌅 출근 시간: ${startTimeStr}
🌙 퇴근 시간: ${endTimeStr}

이제 /퇴근으로 남은 시간을 확인하세요!`;

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

bot.onText(/\/reset_work_time/, (msg) => {
  const chatId = msg.chat.id;
  const userName = Utils.getUserName(msg);
  
  if (WorkTimeManager.resetWorkSchedule(chatId)) {
    const defaultSchedule = WorkTimeManager.getWorkSchedule(chatId);
    const startStr = Utils.formatTimeString(defaultSchedule.startTime);
    const endStr = Utils.formatTimeString(defaultSchedule.endTime);
    
    const message = `🔄 *${userName}님의 근무시간이 초기화되었습니다!*

기본 근무시간: ${startStr} ~ ${endStr}`;

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, "❌ 설정된 개인 근무시간이 없습니다.");
  }
});

// 운세 기능
bot.onText(/\/fortune$/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = Utils.getUserName(msg);
  
  const fortune = FortuneManager.getBasicFortune(userId, userName);
  bot.sendMessage(chatId, fortune, { parse_mode: "Markdown" });
});

bot.onText(/\/fortune_work/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = Utils.getUserName(msg);
  
  const fortune = FortuneManager.getCategoryFortune("work", userId, userName);
  bot.sendMessage(chatId, fortune, { parse_mode: "Markdown" });
});

bot.onText(/\/fortune_party/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = Utils.getUserName(msg);
  
  const fortune = FortuneManager.getCategoryFortune("party", userId, userName);
  bot.sendMessage(chatId, fortune, { parse_mode: "Markdown" });
});

bot.onText(/\/tarot/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = Utils.getUserName(msg);
  
  const fortune = FortuneManager.getTarotFortune(userId, userName);
  bot.sendMessage(chatId, fortune, { parse_mode: "Markdown" });
});

// 상태 및 디버그
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const userName = Utils.getUserName(msg);
  const stats = TodoManager.getTodoStats(chatId);
  const timer = TimerManager.getTimerStatus(chatId);
  const schedule = WorkTimeManager.getWorkSchedule(chatId);

  let message = `📊 *${userName}님의 현재 상태*

📝 *할일 통계*
• 전체: ${stats.total}개
• 완료: ${stats.completed}개  
• 진행중: ${stats.pending}개

⏰ *근무 시간*
• ${Utils.formatTimeString(schedule.startTime)} ~ ${Utils.formatTimeString(schedule.endTime)} ${schedule.isDefault ? "(기본)" : "(개인설정)"}

⏱️ *타이머*`;

  if (timer) {
    message += `\n• 실행중: "${timer.taskName}" (${timer.runningTime}분)`;
  } else {
    message += `\n• 실행중인 타이머 없음`;
  }

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

bot.onText(/\/debug/, (msg) => {
  const chatId = msg.chat.id;
  const debugInfo = WorkTimeManager.getDebugInfo(chatId);
  
  let message = `🔍 *디버그 정보*

**기본 정보**
• ChatID: ${chatId}
• 현재시간: ${debugInfo.currentTime}
• 현재날짜: ${new Date().toLocaleDateString("ko-KR")}
• 요일: ${["일", "월", "화", "수", "목", "금", "토"][new Date().getDay()]}요일

**근무시간 설정**
• 근무시간: ${debugInfo.workHours} ${debugInfo.isDefault ? "(기본)" : "(개인설정)"}
• 현재 상태: ${debugInfo.status}

**상태 상세**`;

  if (debugInfo.details.minutesToLeave !== undefined) {
    message += `\n• 퇴근까지: ${debugInfo.details.minutesToLeave}분`;
  }
  if (debugInfo.details.minutesSinceWork !== undefined) {
    message += `\n• 퇴근 후 경과: ${debugInfo.details.minutesSinceWork}분`;
  }
  if (debugInfo.details.minutesToWork !== undefined) {
    message += `\n• 출근까지: ${debugInfo.details.minutesToWork}분`;
  }

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// 알 수 없는 명령어 처리
bot.on("message", (msg) => {
  const text = msg.text;
  if (!text || !text.startsWith("/")) return;

  const knownCommands = [
    "/start", "/menu", "/help", "/add", "/list", "/done", "/delete", "/clear_completed",
    "/timer", "/stop", "/remind", "/퇴근", "/time2leave", "/퇴근시간", 
    "/set_work_time", "/reset_work_time", "/fortune", "/fortune_work", 
    "/fortune_party", "/tarot", "/status", "/debug"
  ];

  const command = text.split(" ")[0];
  const hasPattern = /^\/add\s+.+|^\/done\s+\d+|^\/delete\s+\d+|^\/timer\s+.+|^\/remind\s+\d+m\s+.+|^\/set_work_time\s+.+\s+.+/.test(text);

  if (!knownCommands.includes(command) && !hasPattern) {
    bot.sendMessage(msg.chat.id, 
      `❓ 알 수 없는 명령어: ${command}\n\n💡 /menu 명령어로 사용 가능한 기능을 확인하세요!`
    );
  }
});

// ==================== 봇 시작 및 에러 처리 ====================
console.log("🤖 doomock_todoBot v3 (완전 리팩토링 버전) 시작!");

bot.on("error", (error) => {
  console.error("봇 에러:", error);
});

bot.on("polling_error", (error) => {
  console.error("폴링 에러:", error);
});

// ==================== 추가 기능 ====================

// 오늘 할일만 보기
bot.onText(/\/today/, (msg) => {
  const chatId = msg.chat.id;
  const todos = TodoManager.getUserTodos(chatId);
  const today = new Date().toDateString();
  const todayTodos = todos.filter(todo => todo.createdAt.toDateString() === today);

  if (todayTodos.length === 0) {
    bot.sendMessage(chatId, "📝 오늘 등록된 할일이 없습니다.");
    return;
  }

  let message = "📋 *오늘의 할일*\n\n";
  todayTodos.forEach((todo, index) => {
    const status = todo.completed ? "✅" : "⏳";
    message += `${index + 1}. ${status} ${todo.text}\n`;
  });

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// 모든 할일 삭제
bot.onText(/\/clear_all/, (msg) => {
  const chatId = msg.chat.id;
  const todos = TodoManager.getUserTodos(chatId);
  
  if (todos.length === 0) {
    bot.sendMessage(chatId, "❌ 삭제할 할일이 없습니다.");
    return;
  }

  storage.todos.delete(chatId);
  bot.sendMessage(chatId, `🗑️ 모든 할일 ${todos.length}개가 삭제되었습니다.`);
});

// 간단한 사용법 안내
bot.onText(/\/quickstart/, (msg) => {
  const message = `🚀 *빠른 시작 가이드*

**가장 많이 사용하는 명령어:**
• /add 할일내용 - 할일 추가
• /list - 할일 목록 보기
• /퇴근 - 퇴근시간 체크
• /fortune - 오늘의 운세

**예시:**
/add 회의 준비하기
/add 보고서 작성
/done 1
/퇴근

더 많은 기능은 /menu를 확인하세요!`;

  bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown" });
});

module.exports = bot;
