const { Markup } = require("telegraf");

const handleCancel = (ctx) => {
  if (ctx.message.text.toLowerCase() === "отмена") {
    ctx.reply(
      "Действие отменено.",
      Markup.keyboard([["Добавить матч"], ["Просмотреть дневник"]]).resize()
    );
    ctx.scene.leave();
    return true;
  }
  return false;
};

module.exports = { handleCancel };
