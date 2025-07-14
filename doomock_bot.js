const TelegramBot = require("node-telegram-bot-api");

// 봇 토큰 (BotFather에서 받은 토큰)
// const token = "7294426076:AAEZEOfP9pkl2GJQ4pLzv4jWZI7RR_MNc2s";
const token = process.env.BOT_TOKEN;

// 봇 생성
const bot = new TelegramBot(token, { polling: true });

// 할일 저장할 배열 (실제로는 데이터베이스 사용 권장)
let todos = [];
let timers = {};

// /start 명령어
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "안녕하세요! 할일 관리 봇입니다.\n/help 명령어로 사용법을 확인하세요."
  );
});

// /help 명령어
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
📋 *할일 관리 봇 사용법*

/add [할일] - 새 할일 추가
/list - 할일 목록 보기
/done [번호] - 할일 완료
/delete [번호] - 할일 삭제
/timer [작업명] - 타이머 시작
/stop - 타이머 중지
/status - 현재 상태 보기

*예시:*
/add 회의 준비하기
/done 1
/delete 2
    `;
  bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
});

// /add 명령어 - 할일 추가
bot.onText(/\/add (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const todoText = match[1];

  todos.push({
    id: todos.length + 1,
    text: todoText,
    completed: false,
    chatId: chatId,
    createdAt: new Date(),
  });

  bot.sendMessage(chatId, `✅ 할일이 추가되었습니다: "${todoText}"`);
});

// /list 명령어 - 할일 목록
bot.onText(/\/list/, (msg) => {
  const chatId = msg.chat.id;
  const userTodos = todos.filter((todo) => todo.chatId === chatId);

  if (userTodos.length === 0) {
    bot.sendMessage(
      chatId,
      "📝 등록된 할일이 없습니다.\n/add [할일]로 할일을 추가해보세요."
    );
    return;
  }

  let message = "📋 *할일 목록*\n\n";
  userTodos.forEach((todo, index) => {
    const status = todo.completed ? "✅" : "⏳";
    message += `${index + 1}. ${status} ${todo.text}\n`;
  });

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// /done 명령어 - 할일 완료
bot.onText(/\/done (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const todoIndex = parseInt(match[1]) - 1;
  const userTodos = todos.filter((todo) => todo.chatId === chatId);

  if (todoIndex >= 0 && todoIndex < userTodos.length) {
    userTodos[todoIndex].completed = true;
    bot.sendMessage(
      chatId,
      `✅ "${userTodos[todoIndex].text}" 완료 처리되었습니다!`
    );
  } else {
    bot.sendMessage(
      chatId,
      "❌ 잘못된 번호입니다. /list로 목록을 확인해주세요."
    );
  }
});

// /delete 명령어 - 할일 삭제
bot.onText(/\/delete (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const todoIndex = parseInt(match[1]) - 1;
  const userTodos = todos.filter((todo) => todo.chatId === chatId);

  if (todoIndex >= 0 && todoIndex < userTodos.length) {
    const deletedTodo = userTodos[todoIndex];
    todos = todos.filter((todo) => todo !== deletedTodo);
    bot.sendMessage(chatId, `🗑️ "${deletedTodo.text}" 삭제되었습니다.`);
  } else {
    bot.sendMessage(
      chatId,
      "❌ 잘못된 번호입니다. /list로 목록을 확인해주세요."
    );
  }
});

// /timer 명령어 - 타이머 시작
bot.onText(/\/timer (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const taskName = match[1];

  if (timers[chatId]) {
    bot.sendMessage(
      chatId,
      "⏰ 이미 실행 중인 타이머가 있습니다. /stop으로 중지 후 다시 시도해주세요."
    );
    return;
  }

  timers[chatId] = {
    taskName: taskName,
    startTime: new Date(),
  };

  bot.sendMessage(chatId, `⏱️ "${taskName}" 타이머가 시작되었습니다!`);
});

// /stop 명령어 - 타이머 중지
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;

  if (!timers[chatId]) {
    bot.sendMessage(chatId, "⏰ 실행 중인 타이머가 없습니다.");
    return;
  }

  const timer = timers[chatId];
  const endTime = new Date();
  const duration = Math.floor((endTime - timer.startTime) / 1000 / 60); // 분 단위

  delete timers[chatId];

  bot.sendMessage(
    chatId,
    `⏹️ "${timer.taskName}" 타이머 중지\n⏰ 소요시간: ${duration}분`
  );
});

// /status 명령어 - 현재 상태
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const userTodos = todos.filter((todo) => todo.chatId === chatId);
  const completedCount = userTodos.filter((todo) => todo.completed).length;
  const pendingCount = userTodos.length - completedCount;

  let message = `📊 *현재 상태*\n\n`;
  message += `📝 전체 할일: ${userTodos.length}개\n`;
  message += `✅ 완료: ${completedCount}개\n`;
  message += `⏳ 진행중: ${pendingCount}개\n\n`;

  if (timers[chatId]) {
    const runningTime = Math.floor(
      (new Date() - timers[chatId].startTime) / 1000 / 60
    );
    message += `⏱️ 실행중: "${timers[chatId].taskName}" (${runningTime}분)`;
  } else {
    message += `⏰ 실행중인 타이머 없음`;
  }

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// /today 명령어 - 오늘 할일
bot.onText(/\/today/, (msg) => {
  const chatId = msg.chat.id;
  const today = new Date().toDateString();
  const todayTodos = todos.filter(
    (todo) => todo.chatId === chatId && todo.createdAt.toDateString() === today
  );

  if (todayTodos.length === 0) {
    bot.sendMessage(chatId, "📅 오늘 추가된 할일이 없습니다.");
    return;
  }

  let message = "📅 *오늘의 할일*\n\n";
  todayTodos.forEach((todo, index) => {
    const status = todo.completed ? "✅" : "⏳";
    message += `${index + 1}. ${status} ${todo.text}\n`;
  });

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// /remind 명령어 - 리마인더 (간단 버전)
bot.onText(/\/remind (\d+)m (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const minutes = parseInt(match[1]);
  const reminderText = match[2];

  bot.sendMessage(
    chatId,
    `⏰ ${minutes}분 후에 "${reminderText}" 알림이 설정되었습니다.`
  );

  setTimeout(() => {
    bot.sendMessage(chatId, `🔔 *리마인더*\n${reminderText}`, {
      parse_mode: "Markdown",
    });
  }, minutes * 60 * 1000);
});

// /settings 명령어 - 설정 (기본)
bot.onText(/\/settings/, (msg) => {
  const chatId = msg.chat.id;
  const settingsText = `⚙️ *봇 설정*\n\n현재 지원되는 기능:\n- 할일 관리\n- 타이머\n- 리마인더\n\n더 많은 기능이 곧 추가될 예정입니다!`;
  bot.sendMessage(chatId, settingsText, { parse_mode: "Markdown" });
});

console.log("🤖 doomock_todoBot이 시작되었습니다!");

// 에러 처리
bot.on("error", (error) => {
  console.log("봇 에러:", error);
});

bot.on("polling_error", (error) => {
  console.log("폴링 에러:", error);
});
