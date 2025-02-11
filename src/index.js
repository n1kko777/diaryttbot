require("dotenv").config();
const { Telegraf, session, Scenes, Markup } = require("telegraf");
const { PrismaClient } = require("@prisma/client");
const { Mistral } = require("@mistralai/mistralai");
const safeReply = require("telegraf-safe-md-reply");

const { addMatchScene } = require("./scenes/addMatchScene");
const { editMatchScene } = require("./scenes/editMatchScene");

const { viewDiary, setFilter, resetFilter } = require("./commands/viewDiary");
const { analyzeGames } = require("./commands/analyze");

const apiKey = process.env.MISTRAL_API_KEY;
const model = process.env.MISTRAL_API_MODEL;

const client = new Mistral({ apiKey: apiKey });

const bot = new Telegraf(process.env.BOT_TOKEN);
const prisma = new PrismaClient();
const stage = new Scenes.Stage([addMatchScene, editMatchScene]);

bot.use(safeReply());

bot.use(Telegraf.log());

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
bot.hears("Сбросить фильтр", resetFilter);

bot.command(["search", "s"], (ctx) => setFilter(ctx, prisma, bot));

bot.command(
  ["ai", "analyze", "scan"],
  async (ctx) => await analyzeGames(ctx, prisma, client, model)
);

// Запуск бота
bot.launch().then(() => console.log("Бот запущен!"));
