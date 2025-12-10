import * as cron from 'node-cron';
import { WebScraper } from '../scraper/index.js';
import { NoteClient } from '../note/index.js';
import { DatabaseManager } from '../database/index.js';

export class Scheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private db: DatabaseManager;
  private scraper: WebScraper;
  private noteClient: NoteClient;

  constructor(db: DatabaseManager, scraper: WebScraper, noteClient: NoteClient) {
    this.db = db;
    this.scraper = scraper;
    this.noteClient = noteClient;
  }

  schedule(name: string, cronExpression: string, url: string, autoPublish: boolean = false) {
    if (this.tasks.has(name)) {
      console.log(`Task ${name} already scheduled, stopping old task...`);
      this.stop(name);
    }

    const task = cron.schedule(cronExpression, async () => {
      console.log(`[${name}] Starting scheduled scraping for ${url}`);
      await this.executeScrapeAndPost(url, autoPublish);
    });

    this.tasks.set(name, task);
    console.log(`Task ${name} scheduled with expression: ${cronExpression}`);
  }

  async executeScrapeAndPost(url: string, autoPublish: boolean = false): Promise<void> {
    const taskId = this.db.createTask(url);

    try {
      this.db.updateTaskStatus(taskId, 'processing');

      const result = await this.noteClient.scrapeAndPost(url, this.scraper, autoPublish);

      if (result.success && result.data) {
        this.db.updateTaskStatus(taskId, 'completed');
        this.db.createPostHistory(taskId, result.data.url, result.data.noteId, 'Scraped Article');
        console.log(`Successfully posted to note: ${result.data.url}`);
      } else {
        this.db.updateTaskStatus(taskId, 'failed', result.error);
        console.error(`Failed to post: ${result.error}`);
      }
    } catch (error: any) {
      this.db.updateTaskStatus(taskId, 'failed', error.message);
      console.error(`Error during scrape and post: ${error.message}`);
    }
  }

  stop(name: string) {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      console.log(`Task ${name} stopped`);
    }
  }

  stopAll() {
    for (const [name, task] of this.tasks.entries()) {
      task.stop();
      console.log(`Task ${name} stopped`);
    }
    this.tasks.clear();
  }

  getActiveTasks(): string[] {
    return Array.from(this.tasks.keys());
  }
}
