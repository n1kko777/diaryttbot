require("dotenv").config();
const { Markup } = require("telegraf");

const pauseTime = process.env.MISTRAL_API_PAUSE;

function getMinuteEnding(minutes) {
  if (minutes === 0) return "минут"; // Например, "0 минут"
  const lastDigit = minutes % 10;
  if (lastDigit === 1 && minutes !== 11) {
    return "минута"; // Например, "1 минута"
  }
  if (lastDigit >= 2 && lastDigit <= 4 && !(minutes >= 12 && minutes <= 14)) {
    return "минуты"; // Например, "2 минуты", "3 минуты", "4 минуты"
  }
  return "минут"; // Все остальные случаи, включая "5 минут", "15 минут" и т.д.
}

function getRemainingTime(dateToCheck) {
  // Получаем текущее время
  const prevDate = new Date(dateToCheck);
  const currentDate = new Date();

  // Вычисляем разницу в миллисекундах
  const timeDifferenceInMs = Math.abs(
    currentDate.getTime() - prevDate.getTime()
  );

  // Преобразуем миллисекунды в минуты
  const minutesDifference = Math.floor(timeDifferenceInMs / (1000 * 60));

  // Возвращаем оставшееся время (если прошло меньше pauseTime минут)
  if (minutesDifference <= pauseTime) {
    return pauseTime - minutesDifference;
  }

  // Если прошло больше pauseTime минут, возвращаем 0
  return 0;
}

const analyzeGames = async (
  ctx,
  prisma,
  client,
  model = "mistral-small-latest"
) => {
  const telegramId = ctx.from.id.toString();
  const user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) {
    return ctx.reply("Сначала зарегистрируйтесь, используя /start.");
  }
  const reqAiTime = ctx.session.reqAiTime;
  const remainingMinutes = getRemainingTime(reqAiTime);

  if (reqAiTime && remainingMinutes > 0) {
    return ctx.reply(
      `Пожалуйста, подождите ${remainingMinutes} ${getMinuteEnding(
        remainingMinutes
      )}`
    );
  }

  const filter = ctx.session.filter || {};
  const buttons = [];

  if (ctx.session.filter && Object.keys(ctx.session.filter).length > 0) {
    buttons.push([
      Markup.button.callback("🔄 Сбросить фильтр", "reset_filter"),
    ]);
  }

  // Получаем все записи матчей пользователя
  const diaries = await prisma.diary.findMany({
    where: { userId: user.id, ...filter },
    include: { games: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (diaries.length === 0) {
    return ctx.reply(
      "Ваш дневник пуст. Добавьте игры перед анализом.",
      Markup.inlineKeyboard(buttons)
    );
  }

  // Формируем данные для анализа
  const analysisData = diaries.map((diary) => ({
    date: diary.createdAt,
    opponent: diary.opponentName,
    style: diary.opponentStyle,
    rating: diary.opponentRating,
    tacticalPlan: diary.tacticalPlan,
    games: diary.games.map((game) => game.score),
    comments: diary.comments,
  }));

  const { message_id } = await ctx.reply("Анализирую...");

  try {
    const chatResponse = await client.chat.complete({
      model,
      messages: [
        {
          role: "user",
          content: `Действуй как профессиональный тренер по настольному теннису с многолетним опытом тренировок спортсменов различных уровней подготовки. Проанализировать предоставленные данные и предоставить рекомендации по улучшению техники, тактики и психологии игры. Также учитывай индивидуальные особенности стиля игрока: ${JSON.stringify(
            analysisData
          )}. Прежде чем дать ответ, глубоко анализируй полученные данные. Учти сильные и слабые стороны игрока, выдели закономерности в его игре и предложи конкретные упражнения или тактические изменения для улучшения. Также подумай, как можно усилить психологическую устойчивость игрока в матчах. Ответ должен быть на русском языке без использования Markdown форматирования.`,
        },
      ],
    });

    const escapedText = chatResponse.choices[0].message.content;

    ctx.deleteMessage(message_id);
    ctx.replyWithSafeMarkdownV2(
      `🏓 Рекомендации на основе ваших игр:\n\n${escapedText}`,
      Markup.inlineKeyboard(buttons)
    );
    ctx.session.reqAiTime = new Date();
  } catch (error) {
    ctx.deleteMessage(message_id);
    console.error("Ошибка при анализе данных:", error);
    ctx.reply(
      "Произошла ошибка при анализе данных. Попробуйте позже.",
      Markup.inlineKeyboard(buttons)
    );
  }
};

module.exports = { analyzeGames };
