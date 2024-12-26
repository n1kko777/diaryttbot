const { Markup } = require("telegraf");

const viewDiary = async (ctx, prisma, bot) => {
  const telegramId = ctx.from.id.toString();
  const user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) {
    return ctx.reply("Сначала зарегистрируйтесь, используя /start.");
  }

  const diaries = await prisma.diary.findMany({
    where: { userId: user.id },
    include: { games: true },
  });

  if (diaries.length === 0) {
    return ctx.reply("Ваш дневник пуст.");
  }

  let currentIndex = 0;

  const displayMatch = async (ctx, index) => {
    const diary = diaries[index];
    const games = diary.games.map((game) => game.score).join(", ");

    await ctx.reply(
      `Соперник: ${diary.opponentName}\n` +
        `Рейтинг: ${diary.opponentRating}\n` +
        `Стиль: ${diary.opponentStyle}\n` +
        `План: ${diary.tacticalPlan}\n` +
        `Игры: ${games}\n` +
        `Комментарий: ${diary.comments || "Нет"}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("← Назад", `prev_${index}`),
          Markup.button.callback("Вперед →", `next_${index}`),
        ],
        [
          Markup.button.callback("Редактировать", `edit_${diary.id}`),
          Markup.button.callback("Удалить", `delete_${diary.id}`),
        ],
      ])
    );
  };

  await displayMatch(ctx, currentIndex);

  bot.action(/prev_(\d+)/, async (ctx) => {
    currentIndex = Math.max(0, parseInt(ctx.match[1]) - 1);
    await displayMatch(ctx, currentIndex);
    await ctx.answerCbQuery();
  });

  bot.action(/next_(\d+)/, async (ctx) => {
    currentIndex = Math.min(diaries.length - 1, parseInt(ctx.match[1]) + 1);
    await displayMatch(ctx, currentIndex);
    await ctx.answerCbQuery();
  });

  bot.action(/edit_(\d+)/, async (ctx) => {
    const diaryId = parseInt(ctx.match[1]);
    ctx.reply(`Редактирование матча ID: ${diaryId} ещё не реализовано.`);
    await ctx.answerCbQuery();
  });

  bot.action(/delete_(\d+)/, async (ctx) => {
    const diaryId = parseInt(ctx.match[1]);

    await prisma.game.deleteMany({
      where: { diaryId },
    });

    await prisma.diary.delete({
      where: { id: diaryId },
    });

    ctx.reply("Матч успешно удалён!");
    await ctx.answerCbQuery();

    // Обновляем отображение после удаления
    diaries.splice(currentIndex, 1);
    if (diaries.length > 0) {
      currentIndex = Math.min(currentIndex, diaries.length - 1);
      await displayMatch(ctx, currentIndex);
    } else {
      ctx.reply("Ваш дневник теперь пуст.");
    }
  });
};

module.exports = { viewDiary };
