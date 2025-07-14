
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.setMyCommands([
  { command: '/menu', description: '📱 메뉴 보기' },
  { command: '/add', description: '📝 할일 추가' },
  { command: '/list', description: '📋 할일 목록' },
  { command: '/done', description: '✅ 완료 처리' },
  { command: '/leave', description: '🏃 퇴근 체크' },
  { command: '/timer', description: '⏰ 타이머 시작' },
  { command: '/stop', description: '⏹️ 타이머 정지' },
  { command: '/fortune', description: '🔮 오늘의 운세' },
  { command: '/status', description: '📊 상태 보기' },
  { command: '/help', description: '❓ 도움말' }
]);

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '안녕하세요! Doomock DoTo Bot에 오신 것을 환영합니다.');
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, '사용 가능한 명령어:\n/menu - 메뉴\n/add - 할일 추가\n/list - 할일 목록\n/done - 완료 처리\n/leave - 퇴근 체크\n/timer - 타이머 시작\n/stop - 타이머 정지\n/fortune - 오늘의 운세\n/status - 상태 보기\n/help - 도움말');
});

bot.onText(/\/leave/, (msg) => {
  const chatId = msg.chat.id;
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (hour > 17 || (hour === 17 && minute >= 30) || hour < 7) {
    bot.sendMessage(chatId, "회사 생각한다고 월급 더 주는 거 아닙니다.");
  } else {
    const offTime = new Date();
    offTime.setHours(17, 30, 0, 0);

    const diffMin = Math.ceil((offTime - now) / 60000);
    bot.sendMessage(chatId, `퇴근까지 ${diffMin}분 남았습니다.`);
  }
});

bot.onText(/\/echo (.+)/, (msg, match) => {
  const resp = match[1];
  bot.sendMessage(msg.chat.id, resp);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (!msg.text.startsWith('/')) {
    bot.sendMessage(chatId, `당신이 보낸 메시지: "${msg.text}"`);
  }
});
