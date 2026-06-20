const express = require("express");
const MovieBot = require("./src/bot");

// Tạo web server để Render giữ bot chạy
const app = express();
// 1. Sửa sang 10000 cho đồng bộ với Render Free mặc định
const PORT = process.env.PORT || 10000;

// Khởi tạo bot
const bot = new MovieBot();
bot.start();

// Health check endpoint (để Render biết bot đang chạy)
app.get("/", (req, res) => {
  res.send("🎬 Movie Store Bot is running!");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// 2. Thêm '0.0.0.0' vào đây để mở rộng cổng cho Render quét được
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server is running on port ${PORT}`);
});

// Graceful shutdown
process.once("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  bot.stop();
  process.exit(0);
});

process.once("SIGTERM", () => {
  console.log("\n🛑 Shutting down...");
  bot.stop();
  process.exit(0);
});

console.log("🚀 Press Ctrl+C to stop the bot");
