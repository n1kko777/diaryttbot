const { Scenes, Markup } = require("telegraf");
const { handleCancel } = require("../utils/handleCancel");

const editMatchScene = new Scenes.WizardScene(
  "edit-match",
  async (ctx) => {
    const diaryId = ctx.scene.state.diaryId;
    ctx.wizard.state.diaryId = diaryId;

    ctx.reply(
      "Что вы хотите изменить?\n" +
        "1. ФИО соперника\n" +
        "2. Рейтинг соперника\n" +
        "3. Стиль игры\n" +
        "4. Тактический план\n" +
        "5. Счёт игр\n" +
        "6. Комментарий\n" +
        'Введите номер или отправьте "Отмена":',
      Markup.keyboard([["Отмена"]]).resize()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (handleCancel(ctx)) return;

    const choice = parseInt(ctx.message.text);
    const validChoices = [1, 2, 3, 4, 5, 6];

    if (!validChoices.includes(choice)) {
      ctx.reply("Неверный выбор. Попробуйте снова:");
      return;
    }

    ctx.wizard.state.choice = choice;

    const prompts = {
      1: "Введите новое ФИО соперника:",
      2: "Введите новый рейтинг соперника:",
      3: "Опишите новый стиль игры соперника:",
      4: "Введите новый тактический план:",
      5: "Введите новый счёт каждой игры через запятую:",
      6: "Введите новый комментарий:",
    };

    ctx.reply(prompts[choice]);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (handleCancel(ctx)) return;
    const prisma = ctx.scene.state.prisma;

    const diaryId = ctx.wizard.state.diaryId;
    const choice = ctx.wizard.state.choice;
    const newValue = ctx.message.text;

    const fields = {
      1: { opponentName: newValue },
      2: { opponentRating: parseInt(newValue) || null },
      3: { opponentStyle: newValue },
      4: { tacticalPlan: newValue },
      5: { games: newValue.split(",").map((s) => ({ score: s.trim() })) },
      6: { comments: newValue },
    };

    if (choice === 5) {
      await prisma.game.deleteMany({ where: { diaryId } });
      await prisma.game.createMany({
        data: fields[5].games.map((game) => ({ score: game.score, diaryId })),
      });
    } else {
      await prisma.diary.update({
        where: { id: diaryId },
        data: fields[choice],
      });
    }

    ctx.reply(
      "Матч успешно отредактирован!",
      Markup.keyboard([["Добавить матч"], ["Просмотреть дневник"]]).resize()
    );
    return ctx.scene.leave();
  }
);

module.exports = { editMatchScene };
