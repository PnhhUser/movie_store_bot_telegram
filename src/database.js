const { Pool } = require("pg");
const path = require("path");
require("dotenv").config();

class MovieDB {
  constructor() {
    this.dbType = process.env.DB_TYPE || "postgres";
    this.initDatabase();
  }

  async initDatabase() {
    if (this.dbType === "postgres") {
      await this.initPostgres();
    } else {
      // Fallback: nếu không có SQLite, báo lỗi
      console.error("❌ SQLite not supported. Please use PostgreSQL.");
      console.log("💡 Set DB_TYPE=postgres in .env");
      process.exit(1);
    }
  }

  async initPostgres() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    await this.pool.connect();
    console.log("✅ Connected to PostgreSQL");
    await this.createTables();
  }

  async createTables() {
    const pgSql = `
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        message_id INTEGER NOT NULL,
        channel_id TEXT NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        added_by BIGINT,
        description TEXT,
        genre TEXT,
        year INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
      CREATE INDEX IF NOT EXISTS idx_movies_message_id ON movies(message_id);
    `;
    await this.pool.query(pgSql);
    console.log("✅ Tables created successfully");
  }

  // Các method giữ nguyên như cũ (đã hỗ trợ PostgreSQL)
  async addMovie(title, messageId, channelId, addedBy, metadata = {}) {
    const { description = "", genre = "", year = null } = metadata;
    const query = `
      INSERT INTO movies (title, message_id, channel_id, added_by, description, genre, year)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      title,
      messageId,
      channelId,
      addedBy,
      description,
      genre,
      year,
    ]);
    return result.rows[0];
  }

  async getMovieByTitle(title) {
    const query = "SELECT * FROM movies WHERE title LIKE $1";
    const result = await this.pool.query(query, [`%${title}%`]);
    return result.rows;
  }

  async getAllMovies() {
    const result = await this.pool.query(
      "SELECT * FROM movies ORDER BY added_at DESC",
    );
    return result.rows;
  }

  async getMovieById(id) {
    const query = "SELECT * FROM movies WHERE id = $1";
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async deleteMovie(id) {
    const query = "DELETE FROM movies WHERE id = $1 RETURNING *";
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = MovieDB;
