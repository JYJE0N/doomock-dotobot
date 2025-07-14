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

//운세 추가
// 확장된 운세 데이터
const fortunes = {
    general: [
        "오늘은 새로운 기회가 찾아올 것 같아요! ✨",
        "평소보다 신중하게 결정을 내리는 것이 좋겠어요 🤔",
        "좋은 소식이 들려올 예정입니다! 📬",
        "오늘은 휴식을 취하며 에너지를 충전하세요 🔋",
        "새로운 사람과의 만남이 좋은 결과를 가져다줄 거예요 👥",
        "작은 일에도 감사하는 마음을 가져보세요 🙏",
        "창의적인 아이디어가 떠오를 수 있는 날이에요 💡",
        "건강에 조금 더 신경 쓰시는 것이 좋겠어요 🏃‍♂️",
        "예상치 못한 행운이 찾아올 수도 있어요! 🍀",
        "오늘은 계획보다는 즉흥적인 행동이 도움될 것 같아요 🎭"
    ],
    work: [
        "업무에서 좋은 성과를 거둘 수 있는 날이에요! 💼",
        "동료와의 협업이 특히 잘 풀릴 것 같아요 🤝",
        "새로운 프로젝트 제안을 받을 수 있어요 📈",
        "오늘은 디테일에 집중하는 것이 중요해요 🔍",
        "리더십을 발휘할 기회가 생길 거예요 👑",
        "회의나 프레젠테이션이 성공적일 예정입니다 🎯",
        "업무 효율이 평소보다 높을 것 같아요 ⚡",
        "상사나 클라이언트로부터 좋은 평가를 받을 수 있어요 ⭐",
        "새로운 기술이나 지식을 배울 기회가 있어요 📚",
        "오늘은 중요한 결정을 미루는 것이 좋겠어요 ⏳"
    ],
    love: [
        "특별한 사람과 좋은 시간을 보낼 수 있어요 💕",
        "새로운 인연을 만날 가능성이 높아요 💘",
        "소중한 사람에게 마음을 전할 좋은 타이밍이에요 💌",
        "연인과의 관계가 한층 깊어질 것 같아요 💑",
        "과거의 인연이 다시 이어질 수도 있어요 🔄",
        "진심 어린 대화가 관계를 개선시킬 거예요 💬",
        "사랑하는 사람을 위한 깜짝 선물을 준비해보세요 🎁",
        "솔직한 마음을 표현하기 좋은 날이에요 😊",
        "이상형과 마주칠 확률이 높아요 ✨",
        "연애보다는 자기계발에 집중하는 것이 좋겠어요 📖"
    ],
    money: [
        "예상치 못한 수입이 생길 수 있어요! 💰",
        "투자에 대해 신중하게 고려해보세요 📊",
        "절약하는 습관이 큰 도움이 될 거예요 🐷",
        "새로운 수입원을 찾을 기회가 있어요 💡",
        "큰 지출은 피하는 것이 좋겠어요 ⛔",
        "재정 계획을 다시 점검해보세요 📋",
        "부업이나 사이드 프로젝트가 성공할 수 있어요 🚀",
        "금전적으로 안정된 하루가 될 것 같아요 ⚖️",
        "투자한 것들이 좋은 결과를 보여줄 거예요 📈",
        "돈보다는 경험에 투자하는 것이 좋겠어요 🎓"
    ],
    health: [
        "몸의 신호에 귀 기울이는 하루가 되세요 👂",
        "가벼운 운동이 큰 도움이 될 거예요 🏃‍♀️",
        "충분한 수분 섭취를 잊지 마세요 💧",
        "스트레칭으로 몸을 풀어주세요 🧘‍♂️",
        "일찍 잠자리에 드는 것이 좋겠어요 😴",
        "비타민이 풍부한 음식을 드세요 🥗",
        "깊은 호흡으로 마음을 진정시켜보세요 🌬️",
        "건강검진을 받을 좋은 타이밍이에요 🏥",
        "목과 어깨 마사지가 필요할 것 같아요 💆‍♂️",
        "오늘은 에너지가 넘치는 하루가 될 거예요 ⚡"
    ],
    party: [
        "동료들과의 회식이 특히 즐거울 것 같아요 🍻",
        "새로운 팀원과 친해질 좋은 기회가 있어요 🤝",
        "상사와의 대화에서 좋은 인상을 남길 수 있어요 👔",
        "회식 자리에서 좋은 아이디어가 나올 것 같아요 💡",
        "오늘은 술자리를 피하는 것이 좋겠어요 🚫",
        "분위기 메이커 역할을 톡톡히 해낼 거예요 🎉",
        "회식 장소 선택을 맡게 될 수도 있어요 🍽️",
        "평소보다 일찍 끝나는 가벼운 모임이 될 것 같아요 ⏰",
        "회식비 걱정 없이 맛있게 드실 수 있어요 💳",
        "네트워킹에 큰 도움이 되는 자리가 될 거예요 📇"
    ],
    family: [
        "가족과의 따뜻한 시간을 보낼 수 있어요 🏠",
        "부모님께 안부 인사를 드려보세요 📞",
        "형제자매와 좋은 대화를 나눌 기회가 있어요 👫",
        "가족 모임이나 식사 자리가 즐거울 거예요 🍽️",
        "어린 시절 추억을 되새겨볼 수 있는 날이에요 📸",
        "가족을 위한 작은 선물을 준비해보세요 🎁",
        "집안일을 도와드리면 좋은 기운이 들어올 거예요 🧹",
        "반려동물과 함께하는 시간이 힐링이 될 거예요 🐕",
        "가족 여행 계획을 세워보는 것은 어떨까요? ✈️",
        "오늘은 집에서 편안히 쉬는 것이 좋겠어요 🛋️"
    ],
    travel: [
        "새로운 장소를 탐험하고 싶은 마음이 들 거예요 🗺️",
        "가까운 곳으로 당일치기 여행을 떠나보세요 🚗",
        "여행 계획을 세우며 설레는 시간을 보내세요 ✈️",
        "현지 맛집을 찾아보는 재미가 쏠쏠할 거예요 🍜",
        "사진 찍기 좋은 장소를 발견할 수 있어요 📷",
        "혼자만의 여행이 특별한 의미가 될 것 같아요 🎒",
        "친구들과 함께하는 여행이 즐거울 거예요 👯‍♂️",
        "문화유적지 방문으로 새로운 영감을 얻어보세요 🏛️",
        "자연 속에서 힐링하는 시간이 필요해요 🌲",
        "여행보다는 집에서 휴식을 취하는 것이 좋겠어요 🏠"
    ]
};

// 행운의 아이템 (카테고리별)
const luckyItems = {
    accessories: ["빨간 스카프", "은색 반지", "가죽 시계", "진주 귀걸이", "골드 목걸이", "실버 팔찌"],
    colors: ["코랄 핑크", "네이비 블루", "에메랄드 그린", "로즈 골드", "라벤더 퍼플", "선셋 오렌지"],
    foods: ["삼겹살", "치킨", "회", "곱창", "족발", "피자", "파스타", "스테이크", "해물탕", "갈비"],
    objects: ["만년필", "향초", "다육식물", "크리스탈", "원목 컵받침", "실크 파우치"],
    activities: ["노래방", "볼링", "당구", "술게임", "맥주 한잔", "와인 시음"]
};

// 별자리별 특별 운세
const zodiacFortunes = {
    "양자리": "에너지가 넘치는 하루! 적극적으로 도전해보세요 🐏",
    "황소자리": "안정감 있게 차근차근 진행하는 것이 좋겠어요 🐂",
    "쌍둥이자리": "소통과 네트워킹이 키워드인 날이에요 👯‍♂️",
    "게자리": "감성이 풍부해지는 하루, 직감을 믿어보세요 🦀",
    "사자자리": "자신감 있게 리더십을 발휘할 때예요 🦁",
    "처녀자리": "세심한 계획과 분석이 성공의 열쇠입니다 🌾",
    "천칭자리": "균형과 조화를 추구하는 것이 중요해요 ⚖️",
    "전갈자리": "집중력과 통찰력이 빛나는 날입니다 🦂",
    "사수자리": "새로운 모험과 학습의 기회가 있어요 🏹",
    "염소자리": "꾸준한 노력이 결실을 맺을 것 같아요 🐐",
    "물병자리": "독창적인 아이디어로 주목받을 수 있어요 🏺",
    "물고기자리": "직관과 감성이 특히 예민한 날이에요 🐟"
};

// 타로 카드 운세
const tarotCards = [
    { name: "The Fool", meaning: "새로운 시작과 모험의 기운이 있어요", emoji: "🃏" },
    { name: "The Magician", meaning: "목표 달성을 위한 능력이 충분해요", emoji: "🎩" },
    { name: "The High Priestess", meaning: "직감을 믿고 내면의 소리에 귀 기울이세요", emoji: "🔮" },
    { name: "The Empress", meaning: "창조성과 풍요로움이 가득한 날이에요", emoji: "👸" },
    { name: "The Emperor", meaning: "리더십과 권위를 발휘할 때입니다", emoji: "👑" },
    { name: "The Star", meaning: "희망과 영감이 샘솟는 하루예요", emoji: "⭐" },
    { name: "The Sun", meaning: "긍정적인 에너지로 가득한 완벽한 날이에요", emoji: "☀️" },
    { name: "The Moon", meaning: "감정과 직감이 중요한 날입니다", emoji: "🌙" }
];

// 운세 점수 (1-100)
function getFortuneScore(userId, category = 'general') {
    const today = new Date().toDateString();
    const seed = userId + today + category;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return (Math.abs(hash) % 100) + 1;
}

// 확장된 운세 함수
function getAdvancedFortune(userId) {
    const today = new Date().toDateString();
    const seed = userId + today;
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    const result = {};
    
    // 각 카테고리별 운세와 점수
    Object.keys(fortunes).forEach((category, index) => {
        const categoryHash = hash >> (index * 4);
        const fortuneIndex = Math.abs(categoryHash) % fortunes[category].length;
        result[category] = {
            message: fortunes[category][fortuneIndex],
            score: getFortuneScore(userId, category)
        };
    });
    
    // 행운의 아이템들
    const itemCategories = Object.keys(luckyItems);
    result.luckyItems = {};
    itemCategories.forEach((category, index) => {
        const itemHash = hash >> (index * 6);
        const itemIndex = Math.abs(itemHash) % luckyItems[category].length;
        result.luckyItems[category] = luckyItems[category][itemIndex];
    });
    
    // 행운의 숫자들
    result.luckyNumbers = [
        (Math.abs(hash) % 45) + 1,
        (Math.abs(hash >> 8) % 45) + 1,
        (Math.abs(hash >> 16) % 45) + 1
    ];
    
    // 타로 카드
    const tarotIndex = Math.abs(hash >> 12) % tarotCards.length;
    result.tarot = tarotCards[tarotIndex];
    
    // 전체 운세 점수 (평균)
    const scores = Object.values(result).filter(item => item.score).map(item => item.score);
    result.totalScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    return result;
}

// 기본 운세 명령어
bot.onText(/\/fortune$/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "님";
    
    const fortune = getAdvancedFortune(userId);
    
    const message = `
🔮 *${userName}의 오늘 종합 운세* 🔮
📅 ${new Date().toLocaleDateString('ko-KR')}

⭐ *종합 운세 점수*: ${fortune.totalScore}/100

🌟 *전체 운세* (${fortune.general.score}/100)
${fortune.general.message}

💼 *업무 운세* (${fortune.work.score}/100)
${fortune.work.message}

💕 *연애 운세* (${fortune.love.score}/100)
${fortune.love.message}

💰 *금전 운세* (${fortune.money.score}/100)
${fortune.money.message}

🎴 *오늘의 타로카드*
${fortune.tarot.emoji} ${fortune.tarot.name}
${fortune.tarot.meaning}

🍀 *행운의 컬러*: ${fortune.luckyItems.colors}
🎲 *행운의 숫자*: ${fortune.luckyNumbers.join(', ')}
    `;
    
    bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// 상세 운세 명령어
bot.onText(/\/fortune_detail/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "님";
    
    const fortune = getAdvancedFortune(userId);
    
    const message = `
🔮 *${userName}의 상세 운세* 🔮

💼 *업무/학업* (${fortune.work.score}/100): ${fortune.work.message}
📚 *공부* (${fortune.study.score}/100): ${fortune.study.message}
💕 *연애* (${fortune.love.score}/100): ${fortune.love.message}
💰 *금전* (${fortune.money.score}/100): ${fortune.money.message}
🏥 *건강* (${fortune.health.score}/100): ${fortune.health.message}
👨‍👩‍👧‍👦 *가족* (${fortune.family.score}/100): ${fortune.family.message}
✈️ *여행* (${fortune.travel.score}/100): ${fortune.travel.message}

🌈 *행운 아이템*
👗 패션: ${fortune.luckyItems.accessories}
🎨 컬러: ${fortune.luckyItems.colors}
🍽️ 음식: ${fortune.luckyItems.foods}
📱 오브젝트: ${fortune.luckyItems.objects}
🧘‍♀️ 활동: ${fortune.luckyItems.activities}

🎲 *행운의 숫자*: ${fortune.luckyNumbers.join(', ')}
    `;
    
    bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// 카테고리별 운세 명령어들
bot.onText(/\/fortune_work/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "님";
    
    const fortune = getAdvancedFortune(userId);
    
    const message = `
💼 *${userName}의 업무 운세*

${fortune.work.message}

📊 *점수*: ${fortune.work.score}/100
🍀 *업무 도움템*: ${fortune.luckyItems.objects}
🎯 *집중할 활동*: ${fortune.luckyItems.activities}
    `;
    
    bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

bot.onText(/\/fortune_love/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "님";
    
    const fortune = getAdvancedFortune(userId);
    
    const message = `
💕 *${userName}의 연애 운세*

${fortune.love.message}

📊 *점수*: ${fortune.love.score}/100
💎 *매력 포인트*: ${fortune.luckyItems.accessories}
🌈 *러키 컬러*: ${fortune.luckyItems.colors}
    `;
    
    bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// 회식 전용 운세 명령어
bot.onText(/\/fortune_party/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "님";
    
    const fortune = getAdvancedFortune(userId);
    
    const message = `
🍻 *${userName}의 회식 운세*

${fortune.party.message}

📊 *점수*: ${fortune.party.score}/100
🍽️ *추천 메뉴*: ${fortune.luckyItems.foods}
🎵 *추천 활동*: ${fortune.luckyItems.activities}
💎 *회식룩 포인트*: ${fortune.luckyItems.accessories}

${fortune.party.score >= 80 ? '🎉 완벽한 회식 날이에요!' : 
  fortune.party.score >= 60 ? '😊 즐거운 회식이 될 것 같아요!' : 
  '🤔 오늘은 가벼운 모임 정도가 좋겠어요!'}
    `;
    
    bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "님";
    
    const fortune = getAdvancedFortune(userId);
    
    const message = `
💰 *${userName}의 금전 운세*

${fortune.money.message}

📊 *점수*: ${fortune.money.score}/100
🎲 *행운의 숫자*: ${fortune.luckyNumbers.join(', ')}
💎 *부를 부르는 아이템*: ${fortune.luckyItems.objects}
    `;
    
    bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// 타로 운세
bot.onText(/\/tarot/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "님";
    
    const fortune = getAdvancedFortune(userId);
    
    const message = `
🎴 *${userName}의 오늘 타로 운세*

${fortune.tarot.emoji} **${fortune.tarot.name}**

${fortune.tarot.meaning}

✨ *타로가 전하는 메시지*
오늘 하루 이 카드의 에너지를 느끼며 보내보세요.
    `;
    
    bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// 운세 점수만 간단히
bot.onText(/\/fortune_score/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "님";
    
    const fortune = getAdvancedFortune(userId);
    
    const message = `
📊 *${userName}의 오늘 운세 점수*

⭐ 종합: ${fortune.totalScore}/100
💼 업무: ${fortune.work.score}/100
💕 연애: ${fortune.love.score}/100
💰 금전: ${fortune.money.score}/100
🏥 건강: ${fortune.health.score}/100
📚 학습: ${fortune.study.score}/100
👨‍👩‍👧‍👦 가족: ${fortune.family.score}/100
✈️ 여행: ${fortune.travel.score}/100

${fortune.totalScore >= 80 ? '🌟 최고의 날이에요!' : 
  fortune.totalScore >= 60 ? '😊 좋은 하루가 될 것 같아요!' : 
  '💪 조금 더 신중한 하루를 보내세요!'}
    `;
    
    bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// 주간 운세 (보너스)
bot.onText(/\/fortune_week/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "님";
    
    const today = new Date();
    const weekScores = [];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toDateString();
        const dayScore = getFortuneScore(userId + dateString, 'general');
        weekScores.push({
            day: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
            score: dayScore,
            date: date.getDate()
        });
    }
    
    const weekMessage = weekScores.map(day => 
        `${day.day}(${day.date}일): ${day.score}/100 ${day.score >= 80 ? '🌟' : day.score >= 60 ? '😊' : '💪'}`
    ).join('\n');
    
    const message = `
📅 *${userName}의 주간 운세*

${weekMessage}

✨ *이번 주 베스트 데이*: ${weekScores.reduce((best, current) => 
        current.score > best.score ? current : best
    ).day}요일

💡 *조심할 날*: ${weekScores.reduce((worst, current) => 
        current.score < worst.score ? current : worst
    ).day}요일
    `;
    
    bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

console.log("🤖 doomock_todoBot이 시작되었습니다!");

// 에러 처리
bot.on("error", (error) => {
  console.log("봇 에러:", error);
});

bot.on("polling_error", (error) => {
  console.log("폴링 에러:", error);
});
