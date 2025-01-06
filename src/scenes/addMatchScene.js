const { Scenes, Markup } = require("telegraf");
const { handleCancel } = require("../utils/handleCancel");

const addMatchScene = new Scenes.WizardScene(
  "add-match",
  async (ctx) => {
    ctx.reply(
      'Введите ФИО соперника или нажмите "Отмена" для выхода:',
      Markup.keyboard([["Отмена"]]).resize()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (handleCancel(ctx)) return;
    ctx.wizard.state.opponentName = ctx.message.text;
    ctx.reply(
      'Введите рейтинг соперника или нажмите "Отмена" для выхода:',
      Markup.keyboard([["Отмена"]]).resize()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (handleCancel(ctx)) return;
    const rating = parseInt(ctx.message.text);
    if (isNaN(rating)) {
      ctx.reply("Рейтинг должен быть числом. Попробуйте снова:");
      return;
    }
    ctx.wizard.state.opponentRating = rating;
    ctx.reply(
      'Опишите стиль игры соперника или нажмите "Отмена" для выхода:',
      Markup.keyboard([["Отмена"]]).resize()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (handleCancel(ctx)) return;
    ctx.wizard.state.opponentStyle = ctx.message.text;
    ctx.reply(
      'Введите ваш тактический план или нажмите "Отмена" для выхода:',
      Markup.keyboard([["Отмена"]]).resize()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (handleCancel(ctx)) return;
    ctx.wizard.state.tacticalPlan = ctx.message.text;
    ctx.reply(
      'Введите счёт каждой игры через запятую или нажмите "Отмена" для выхода:',
      Markup.keyboard([["Отмена"]]).resize()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (handleCancel(ctx)) return;
    const scores = ctx.message.text.split(",").map((s) => s.trim());
    ctx.wizard.state.scores = scores;
    ctx.reply(
      'Добавьте комментарий или нажмите "Отмена" для выхода:',
      Markup.keyboard([["Отмена"]]).resize()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (handleCancel(ctx)) return;
    const prisma = ctx.scene.state.prisma;

    const {
      opponentName,
      opponentRating,
      opponentStyle,
      tacticalPlan,
      scores,
    } = ctx.wizard.state;
    const comments = ctx.message.text || null;
    const telegramId = ctx.from.id.toString();

    const user = await prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      ctx.reply("Сначала зарегистрируйтесь, используя /start.");
      return ctx.scene.leave();
    }

    await prisma.diary.create({
      data: {
        opponentName,
        opponentRating,
        opponentStyle,
        tacticalPlan,
        comments,
        userId: user.id,
        games: {
          create: scores.map((score) => ({ score })),
        },
      },
    });

    ctx.reply(
      "Матч успешно добавлен в ваш дневник!",
      Markup.keyboard([["Добавить матч"], ["Просмотреть дневник"]]).resize()
    );
    return ctx.scene.leave();
  }
);

module.exports = { addMatchScene };
