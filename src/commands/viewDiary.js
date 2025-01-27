const { Markup } = require("telegraf");

// Установка фильтра по ФИО
const setFilter = (ctx, prisma, bot) => {
  const fullName = ctx.message.text.split(" ").slice(1).join(" ");
  ctx.session.filter = { opponentName: { contains: fullName } };
  ctx.reply(`Фильтр установлен: ${fullName}`);
  viewDiary(ctx, prisma, bot);
};

// Сброс фильтра
const resetFilter = (ctx) => {
  ctx.session.filter = {};
  ctx.reply("Фильтр сброшен.");
};

const viewDiary = async (ctx, prisma, bot) => {
  const telegramId = ctx.from.id.toString();
  const user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) {
    return ctx.reply("Сначала зарегистрируйтесь, используя /start.");
  }

  // Получение фильтра из контекста (например, имя соперника)
  const filter = ctx.session.filter || {};
  const diaries = await prisma.diary.findMany({
    where: {
      userId: user.id,
      ...filter,
    },
    include: { games: true },
    orderBy: { createdAt: "desc" },
  });

  if (diaries.length === 0) {
    const buttons = [];

    if (ctx.session.filter && Object.keys(ctx.session.filter).length > 0) {
      buttons.push([
        Markup.button.callback("🔄 Сбросить фильтр", "reset_filter"),
      ]);
    }

    return ctx.reply(
      "Ваш дневник пуст или фильтр не дал результатов.",
      Markup.inlineKeyboard(buttons)
    );
  }

  // Параметры для постраничного отображения
  let currentIndex = ctx.session.currentIndex || 0;
  const pageSize = 1;

  const displayMatches = async () => {
    const currentPage = diaries.slice(currentIndex, currentIndex + pageSize);

    if (currentPage.length === 0) {
      return ctx.reply("Больше записей нет.", [
        [
          Markup.button.callback("⬅️ Назад", "prev_page"),
          Markup.button.callback("Вперед ➡️", "next_page"),
        ],
      ]);
    }

    const [diary] = currentPage;
    const games = diary.games.map((game) => game.score).join(", ");

    const message =
      `📅 Дата: ${new Date(diary.createdAt).toLocaleDateString()}\n` +
      `👤 Соперник: ${diary.opponentName}\n` +
      `🏅 Рейтинг: ${diary.opponentRating}\n` +
      `🎯 Стиль: ${diary.opponentStyle}\n` +
      `📝 План: ${diary.tacticalPlan}\n` +
      `🎮 Игры: ${games}\n` +
      `💬 Комментарий: ${diary.comments || "Нет"}`;

    const buttons = [];

    if (!(currentIndex === 0 && currentIndex + pageSize === diaries.length)) {
      buttons.push([
        Markup.button.callback(
          currentIndex === 0 ? "🚫" : "⬅️ Назад",
          "prev_page"
        ),
        Markup.button.callback(
          currentIndex + pageSize === diaries.length ? "🚫" : "Вперед ➡️",
          "next_page"
        ),
      ]);
    }

    buttons.push([
      Markup.button.callback("Редактировать", `edit_${diary.id}`),
      Markup.button.callback("Удалить", `delete_${diary.id}`),
    ]);

    // Добавляем кнопку "Сбросить фильтр", только если фильтр активен
    if (ctx.session.filter && Object.keys(ctx.session.filter).length > 0) {
      buttons.push([
        Markup.button.callback("🔄 Сбросить фильтр", "reset_filter"),
      ]);
    }

    await ctx.reply(message, Markup.inlineKeyboard(buttons));
  };

  displayMatches();

  bot.action("prev_page", async (actionCtx) => {
    if (currentIndex > 0) {
      await actionCtx.deleteMessage();
      currentIndex -= pageSize;
      ctx.session.currentIndex = currentIndex;
      await actionCtx.answerCbQuery();
      await displayMatches();
    } else {
      await actionCtx.answerCbQuery();
    }
  });

  bot.action("next_page", async (actionCtx) => {
    if (currentIndex + pageSize < diaries.length) {
      await actionCtx.deleteMessage();
      currentIndex += pageSize;
      ctx.session.currentIndex = currentIndex;
      await actionCtx.answerCbQuery();
      await displayMatches();
    } else {
      await actionCtx.answerCbQuery();
    }
  });

  bot.action("reset_filter", async (actionCtx) => {
    await actionCtx.answerCbQuery();
    resetFilter(actionCtx);
  });

  bot.action(/edit_(\d+)/, async (ctx) => {
    const diaryId = parseInt(ctx.match[1]);
    ctx.reply(`Редактирование матча ID: ${diaryId} ещё не реализовано.`);
    await ctx.answerCbQuery();
  });

  bot.action(/delete_(\d+)/, async (ctx) => {
    try {
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
    } catch (error) {
      ctx.reply("Невозможно удалить запись, возможно она была удалена ранее");
    }
  });
};

module.exports = {
  viewDiary,
  setFilter,
  resetFilter,
};
