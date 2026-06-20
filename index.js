const express = require("express");
const MovieBot = require("./src/bot");

// Tạo web server để Render giữ bot chạy
const app = express();
const PORT = process.env.PORT || 3000;

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

// Start web server
app.listen(PORT, () => {
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
