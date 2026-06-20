const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config();

class Database {
  constructor() {
    this.dbType = process.env.DB_TYPE || "sqlite";

    if (this.dbType === "postgres") {
      this.initPostgres();
    } else {
      this.initSqlite();
    }
  }

  initSqlite() {
    // ✅ Sửa path: tạo file movies.db ở thư mục gốc
    const dbPath = path.join(process.cwd(), "movies.db");
    console.log("📁 Database path:", dbPath);

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Error connecting to SQLite:", err);
      } else {
        console.log("✅ Connected to SQLite database");
        this.createTables();
      }
    });
  }

  async initPostgres() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    await this.pool.connect();
    console.log("✅ Connected to PostgreSQL");
    await this.createTables();
  }

  createTables() {
    const sql = `
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message_id INTEGER NOT NULL,
        channel_id TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        added_by INTEGER,
        description TEXT,
        genre TEXT,
        year INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
      CREATE INDEX IF NOT EXISTS idx_movies_message_id ON movies(message_id);
    `;

    if (this.dbType === "postgres") {
      const pgSql = sql
        .replace(/AUTOINCREMENT/g, "SERIAL")
        .replace(/DATETIME/g, "TIMESTAMP")
        .replace(/CREATE INDEX IF NOT EXISTS/g, "CREATE INDEX IF NOT EXISTS");

      return this.pool.query(pgSql);
    }

    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else {
          console.log("✅ Tables created successfully");
          resolve();
        }
      });
    });
  }

  // Methods
  async addMovie(title, messageId, channelId, addedBy, metadata = {}) {
    const { description = "", genre = "", year = null } = metadata;

    if (this.dbType === "postgres") {
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

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO movies (title, message_id, channel_id, added_by, description, genre, year)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, messageId, channelId, addedBy, description, genre, year],
        function (err) {
          if (err) reject(err);
          else {
            resolve({
              id: this.lastID,
              title,
              message_id: messageId,
              channel_id: channelId,
              description,
              genre,
              year,
            });
          }
        },
      );
    });
  }

  async getMovieByTitle(title) {
    if (this.dbType === "postgres") {
      const query = "SELECT * FROM movies WHERE title LIKE $1";
      const result = await this.pool.query(query, [`%${title}%`]);
      return result.rows;
    }

    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM movies WHERE title LIKE ?",
        [`%${title}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
  }

  async getAllMovies() {
    if (this.dbType === "postgres") {
      const result = await this.pool.query(
        "SELECT * FROM movies ORDER BY added_at DESC",
      );
      return result.rows;
    }

    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM movies ORDER BY added_at DESC",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
  }

  async deleteMovie(id) {
    if (this.dbType === "postgres") {
      const result = await this.pool.query(
        "DELETE FROM movies WHERE id = $1 RETURNING *",
        [id],
      );
      return result.rows[0];
    }

    return new Promise((resolve, reject) => {
      this.db.get("DELETE FROM movies WHERE id = ?", [id], function (err, row) {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getMovieById(id) {
    if (this.dbType === "postgres") {
      const query = "SELECT * FROM movies WHERE id = $1";
      const result = await this.pool.query(query, [id]);
      return result.rows[0];
    }

    return new Promise((resolve, reject) => {
      this.db.get("SELECT * FROM movies WHERE id = ?", [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

module.exports = Database;
