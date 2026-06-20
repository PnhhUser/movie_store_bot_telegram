const MovieBot = require("./src/bot");

const bot = new MovieBot();
bot.start();

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
