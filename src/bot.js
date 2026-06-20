const { Telegraf, Markup, session } = require("telegraf");
const Database = require("./database");
require("dotenv").config();

class MovieBot {
  constructor() {
    this.bot = new Telegraf(process.env.BOT_TOKEN);

    // ✅ Thêm session middleware
    this.bot.use(session());

    this.db = new Database();
    this.CHANNEL_ID = process.env.CHANNEL_ID;
    this.ADMIN_IDS = process.env.ADMIN_IDS.split(",").map((id) => parseInt(id));

    this.setupHandlers();
  }

  setupHandlers() {
    // Start command
    this.bot.start((ctx) => {
      ctx.reply(
        "🎬 Welcome to Movie Store Bot!\n\n" +
          "Commands:\n" +
          "/addmovie - Add new movie (Admin only)\n" +
          "/search <title> - Search movie\n" +
          "/list - List all movies\n" +
          "/help - Show help\n" +
          "/cancel - Cancel adding movie",
        Markup.keyboard([
          ["🔍 Search Movie", "📋 List Movies"],
          ["➕ Add Movie", "❓ Help"],
        ]).resize(),
      );
    });

    // Help command
    this.bot.help((ctx) => {
      ctx.reply(
        "🎬 Movie Bot Help\n\n" +
          "To add a movie:\n" +
          "1. Send /addmovie\n" +
          "2. Enter movie title\n" +
          "3. Enter description\n" +
          "4. Enter genre\n" +
          "5. Enter year\n" +
          "6. Send the video file\n\n" +
          "To search: /search <movie name>\n" +
          "To list all: /list\n" +
          "To delete: /delete <id> (Admin only)\n" +
          "To cancel: /cancel (Hủy quá trình thêm phim)",
      );
    });

    // Cancel command - hủy quá trình thêm phim
    this.bot.command("cancel", async (ctx) => {
      if (ctx.session && ctx.session.addingMovie) {
        // Reset session
        ctx.session.addingMovie = false;
        ctx.session.step = null;
        ctx.session.movieTitle = null;
        ctx.session.movieDescription = null;
        ctx.session.movieGenre = null;
        ctx.session.movieYear = null;

        await ctx.reply(
          "❌ Đã hủy quá trình thêm phim. Bạn có thể bắt đầu lại với /addmovie",
        );
      } else {
        await ctx.reply("ℹ️ Hiện không có quá trình nào để hủy.");
      }
    });

    // Add movie command (admin only)
    this.bot.command("addmovie", async (ctx) => {
      if (!this.isAdmin(ctx.from.id)) {
        return ctx.reply("⛔ Only admins can add movies.");
      }

      ctx.session = ctx.session || {};
      ctx.session.addingMovie = true;
      ctx.session.step = "title";

      await ctx.reply("📝 Enter the movie title:");
    });

    // Search command
    this.bot.command("search", async (ctx) => {
      const query = ctx.message.text.replace("/search", "").trim();

      if (!query) {
        return ctx.reply(
          "❌ Please provide a search term.\nExample: /search Avengers",
        );
      }

      const movies = await this.db.getMovieByTitle(query);

      if (movies.length === 0) {
        return ctx.reply(`❌ No movies found for "${query}"`);
      }

      let response = `🎬 Found ${movies.length} movie(s):\n\n`;
      movies.forEach((movie, index) => {
        response += `${index + 1}. ${movie.title}\n`;
        if (movie.description) response += `   📝 ${movie.description}\n`;
        if (movie.genre) response += `   🎭 ${movie.genre}\n`;
        if (movie.year) response += `   📅 ${movie.year}\n`;
        response += `   🆔 ID: ${movie.id}\n\n`;
      });

      await ctx.reply(response);
    });

    // List command
    this.bot.command("list", async (ctx) => {
      const movies = await this.db.getAllMovies();

      if (movies.length === 0) {
        return ctx.reply("📭 No movies in store yet.");
      }

      let response = `🎬 All Movies (${movies.length}):\n\n`;
      movies.slice(0, 10).forEach((movie, index) => {
        response += `${index + 1}. ${movie.title}\n`;
        response += `   🆔 ID: ${movie.id}\n`;
        if (movie.genre) response += `   🎭 ${movie.genre}\n`;
        if (movie.year) response += `   📅 ${movie.year}\n`;
        response += `\n`;
      });

      if (movies.length > 10) {
        response += `... and ${movies.length - 10} more`;
      }

      await ctx.reply(response);
    });

    // Delete movie command (admin only)
    this.bot.command("delete", async (ctx) => {
      if (!this.isAdmin(ctx.from.id)) {
        return ctx.reply("⛔ Only admins can delete movies.");
      }

      const id = ctx.message.text.replace("/delete", "").trim();

      if (!id) {
        return ctx.reply("❌ Please provide movie ID.\nExample: /delete 5");
      }

      // Lấy thông tin movie trước khi xóa
      const movie = await this.db.getMovieById(parseInt(id));

      if (!movie) {
        return ctx.reply(`❌ Movie with ID ${id} not found.`);
      }

      // Xóa khỏi database
      await this.db.deleteMovie(parseInt(id));

      // Delete message from channel
      try {
        await ctx.telegram.deleteMessage(this.CHANNEL_ID, movie.message_id);
        ctx.reply(`✅ Movie "${movie.title}" deleted successfully!`);
      } catch (error) {
        console.error("Error deleting message from channel:", error);
        ctx.reply(
          `⚠️ Movie "${movie.title}" removed from database but could not delete from channel.`,
        );
      }
    });

    // Handle text messages for movie addition
    this.bot.on("text", async (ctx) => {
      if (ctx.session && ctx.session.addingMovie) {
        await this.handleAddMovieStep(ctx);
        return;
      }

      // Handle button clicks
      const text = ctx.message.text;
      if (text === "🔍 Search Movie") {
        await ctx.reply("Use /search <movie title>");
      } else if (text === "📋 List Movies") {
        await ctx.reply("/list");
      } else if (text === "➕ Add Movie") {
        await ctx.reply("/addmovie");
      } else if (text === "❓ Help") {
        await ctx.reply("/help");
      }
    });

    // Handle video messages
    this.bot.on("video", async (ctx) => {
      if (!this.isAdmin(ctx.from.id)) {
        return ctx.reply("⛔ Only admins can upload videos.");
      }

      if (
        ctx.session &&
        ctx.session.addingMovie &&
        ctx.session.step === "video"
      ) {
        await this.handleVideoUpload(ctx);
      } else {
        ctx.reply("❌ Please use /addmovie command first.");
      }
    });

    // Handle errors
    this.bot.catch((err, ctx) => {
      console.error("Bot error:", err);
      ctx.reply("❌ An error occurred. Please try again.");
    });
  }

  async handleAddMovieStep(ctx) {
    const step = ctx.session.step;
    const text = ctx.message.text;

    if (step === "title") {
      ctx.session.movieTitle = text;
      ctx.session.step = "description";
      await ctx.reply("📝 Enter a description (or send /skip to skip):");
    } else if (step === "description") {
      if (text !== "/skip") {
        ctx.session.movieDescription = text;
      }
      ctx.session.step = "genre";
      await ctx.reply("🎭 Enter genre (Action, Comedy, Drama, etc. or /skip):");
    } else if (step === "genre") {
      if (text !== "/skip") {
        ctx.session.movieGenre = text;
      }
      ctx.session.step = "year";
      await ctx.reply("📅 Enter release year (or /skip):");
    } else if (step === "year") {
      if (text !== "/skip") {
        const year = parseInt(text);
        if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear()) {
          ctx.session.movieYear = year;
        } else {
          await ctx.reply(
            "❌ Invalid year. Please enter a valid year or /skip:",
          );
          return;
        }
      }
      ctx.session.step = "video";
      await ctx.reply("📤 Now send the video file:");
    }
  }

  async handleVideoUpload(ctx) {
    try {
      const video = ctx.message.video;

      // Tạo caption cho video
      let caption = `🎬 ${ctx.session.movieTitle}`;
      if (ctx.session.movieDescription) {
        caption += `\n📝 ${ctx.session.movieDescription}`;
      }
      if (ctx.session.movieGenre) {
        caption += `\n🎭 ${ctx.session.movieGenre}`;
      }
      if (ctx.session.movieYear) {
        caption += `\n📅 ${ctx.session.movieYear}`;
      }

      // Send video to channel
      const sentMessage = await ctx.telegram.sendVideo(
        this.CHANNEL_ID,
        video.file_id,
        {
          caption: caption,
          width: video.width,
          height: video.height,
          duration: video.duration,
          supports_streaming: true,
        },
      );

      // Save to database
      const movie = await this.db.addMovie(
        ctx.session.movieTitle,
        sentMessage.message_id,
        this.CHANNEL_ID,
        ctx.from.id,
        {
          description: ctx.session.movieDescription || "",
          genre: ctx.session.movieGenre || "",
          year: ctx.session.movieYear || null,
        },
      );

      // Reset session
      ctx.session.addingMovie = false;
      ctx.session.step = null;
      ctx.session.movieTitle = null;
      ctx.session.movieDescription = null;
      ctx.session.movieGenre = null;
      ctx.session.movieYear = null;

      await ctx.reply(
        `✅ Movie added successfully!\n\n` +
          `📌 Title: ${movie.title}\n` +
          `🆔 Movie ID: ${movie.id}\n` +
          `📝 Description: ${movie.description || "N/A"}\n` +
          `🎭 Genre: ${movie.genre || "N/A"}\n` +
          `📅 Year: ${movie.year || "N/A"}\n\n` +
          `Users can search with: /search ${movie.title}`,
      );
    } catch (error) {
      console.error("Error uploading video:", error);
      ctx.reply("❌ Failed to upload video. Please try again.");
    }
  }

  isAdmin(userId) {
    return this.ADMIN_IDS.includes(userId);
  }

  start() {
    this.bot.launch();
    console.log("🤖 Movie Bot is running...");
    console.log(`📌 Channel: ${this.CHANNEL_ID}`);
    console.log(`👑 Admins: ${this.ADMIN_IDS.join(", ")}`);
    console.log(`💾 Database: ${process.env.DB_TYPE}`);
  }

  stop() {
    this.bot.stop();
  }
}

module.exports = MovieBot;
