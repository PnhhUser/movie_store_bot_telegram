const { Telegraf } = require("telegraf");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);

async function checkAdmin() {
  const channelId = process.env.CHANNEL_ID;

  try {
    const me = await bot.telegram.getMe();
    const member = await bot.telegram.getChatMember(channelId, me.id);

    console.log("🤖 Bot:", me.username);
    console.log("📢 Trạng thái trong channel:", member.status);

    if (member.status === "administrator") {
      console.log("✅✅✅ BOT ĐÃ LÀ ADMIN! 🎉");
      console.log("🚀 Bây giờ bạn có thể thêm phim!");
    } else {
      console.log(
        "⚠️ Bot chưa là admin. Vui lòng thêm bot làm admin trong channel settings.",
      );
    }
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  }
}

checkAdmin();
