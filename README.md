# 🎬 Movie Store Telegram Bot

## Installation

1. Clone repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your values
4. Run `npm start`

## Bot Commands

### User Commands

- `/start` - Welcome message
- `/help` - Show help
- `/search <title>` - Search for movies
- `/list` - List all movies
- `/cancel` - Cancel adding movie

### Admin Commands

- `/addmovie` - Add a new movie (step-by-step)
- `/delete <id>` - Delete a movie

## Setup Guide

1. Create a bot with @BotFather on Telegram
2. Create a private channel for storing movies
3. Add bot as admin to the channel
4. Fill in `.env` file:
   - BOT_TOKEN: Your bot token
   - CHANNEL_ID: Your channel username or ID
   - ADMIN_IDS: Your Telegram user IDs
   - DB_TYPE: sqlite or postgres

## Database

### SQLite (default)

- No configuration needed
- Database file: movies.db

### PostgreSQL

- Set DB_TYPE=postgres
- Set DATABASE_URL in .env
