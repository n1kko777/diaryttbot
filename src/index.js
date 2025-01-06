require("dotenv").config();
const { Telegraf, session, Scenes, Markup } = require("telegraf");
const { PrismaClient } = require("@prisma/client");

const { addMatchScene } = require("./scenes/addMatchScene");
const { editMatchScene } = require("./scenes/editMatchScene");

const { viewDiary } = require("./commands/viewDiary");

const bot = new Telegraf(process.env.BOT_TOKEN);
const prisma = new PrismaClient();
const stage = new Scenes.Stage([addMatchScene, editMatchScene]);

bot.use(session());
bot.use(stage.middleware());

// Команда /start
bot.start(async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const username = ctx.from.username || null;

  let user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) {
    user = await prisma.user.create({
      data: { telegramId, username },
    });
  }

  ctx.reply(
    "Добро пожаловать в дневник теннисиста!\n\n" +
      "Вот что вы можете сделать с помощью этого бота:\n" +
      "- Добавить матч\n" +
      "- Просмотреть дневник\n\n" +
      "Выберите действие:",
    Markup.keyboard([["Добавить матч"], ["Просмотреть дневник"]]).resize()
  );
});

// Команда добавления матча
bot.hears("Добавить матч", (ctx) => {
  ctx.scene.enter("add-match", { prisma });
});

bot.action(/edit_(\d+)/, (ctx) => {
  const diaryId = parseInt(ctx.match[1]);
  ctx.scene.enter("edit-match", { diaryId, prisma });
});

// Команда просмотра дневника
bot.hears("Просмотреть дневник", (ctx) => viewDiary(ctx, prisma, bot));

// Запуск бота
bot.launch().then(() => console.log("Бот запущен!"));
