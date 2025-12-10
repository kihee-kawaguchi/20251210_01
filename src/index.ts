import dotenv from 'dotenv';
import { WebScraper } from './scraper/index.js';
import { NoteClient } from './note/index.js';
import { DatabaseManager } from './database/index.js';
import { Scheduler } from './scheduler/index.js';
import { APIServer } from './api/index.js';
import fs from 'fs';

dotenv.config();

async function main() {
  console.log('🚀 Web Scraper to Note - Starting...');

  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
  }

  const noteApiToken = process.env.NOTE_API_TOKEN;
  const noteBaseUrl = process.env.NOTE_BASE_URL || 'https://note.com/api/v2';
  const port = parseInt(process.env.PORT || '3000');
  const usePuppeteer = process.env.USE_PUPPETEER === 'true';

  if (!noteApiToken) {
    console.warn('⚠️  NOTE_API_TOKEN not set in .env file');
    console.warn('⚠️  Note posting will not work without a valid API token');
  }

  const db = new DatabaseManager('./data/app.db');
  console.log('✅ Database initialized');

  const scraper = new WebScraper(usePuppeteer);
  console.log(`✅ Web scraper initialized (using ${usePuppeteer ? 'Puppeteer' : 'Cheerio'})`);

  const noteClient = new NoteClient(noteApiToken || '', noteBaseUrl);
  console.log('✅ Note client initialized');

  const scheduler = new Scheduler(db, scraper, noteClient);
  console.log('✅ Scheduler initialized');

  const savedSchedules = db.getConfig('schedules');
  if (savedSchedules) {
    try {
      const schedules = JSON.parse(savedSchedules);
      for (const schedule of schedules) {
        scheduler.schedule(
          schedule.name,
          schedule.cronExpression,
          schedule.url,
          schedule.autoPublish
        );
      }
      console.log(`✅ Loaded ${schedules.length} saved schedules`);
    } catch (error) {
      console.error('Failed to load saved schedules:', error);
    }
  }

  const apiServer = new APIServer(db, scraper, noteClient, scheduler);
  apiServer.start(port);

  console.log('\n📋 Configuration:');
  console.log(`   - Port: ${port}`);
  console.log(`   - Database: ./data/app.db`);
  console.log(`   - Scraper: ${usePuppeteer ? 'Puppeteer' : 'Cheerio'}`);
  console.log(`   - Note API: ${noteBaseUrl}`);
  console.log('\n✨ Server is ready!');
  console.log(`   Open http://localhost:${port} in your browser\n`);

  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    scheduler.stopAll();
    db.close();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
