import express, { Request, Response } from 'express';
import { WebScraper } from '../scraper/index.js';
import { NoteClient } from '../note/index.js';
import { DatabaseManager } from '../database/index.js';
import { Scheduler } from '../scheduler/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class APIServer {
  private app: express.Application;
  private db: DatabaseManager;
  private scraper: WebScraper;
  private noteClient: NoteClient;
  private scheduler: Scheduler;

  constructor(
    db: DatabaseManager,
    scraper: WebScraper,
    noteClient: NoteClient,
    scheduler: Scheduler
  ) {
    this.app = express();
    this.db = db;
    this.scraper = scraper;
    this.noteClient = noteClient;
    this.scheduler = scheduler;

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.static(path.join(__dirname, '../public')));
    // exportsディレクトリを静的ファイルとして配信
    this.app.use('/exports', express.static(path.join(process.cwd(), 'exports')));
  }

  private setupRoutes() {
    this.app.get('/', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    this.app.post('/api/scrape', async (req: Request, res: Response) => {
      try {
        const { url, autoPublish } = req.body;

        if (!url) {
          return res.status(400).json({ error: 'URL is required' });
        }

        await this.scheduler.executeScrapeAndPost(url, autoPublish || false);

        res.json({ success: true, message: 'Scraping and posting initiated' });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/tasks', (req: Request, res: Response) => {
      try {
        const status = req.query.status as string | undefined;
        const tasks = this.db.getAllTasks(status);
        res.json({ success: true, data: tasks });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/tasks/:id', (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const task = this.db.getTask(id);

        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ success: true, data: task });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/history', (req: Request, res: Response) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const history = this.db.getPostHistory(limit);
        res.json({ success: true, data: history });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/schedule', (req: Request, res: Response) => {
      try {
        const { name, cronExpression, url, autoPublish } = req.body;

        if (!name || !cronExpression || !url) {
          return res.status(400).json({ error: 'name, cronExpression, and url are required' });
        }

        this.scheduler.schedule(name, cronExpression, url, autoPublish || false);

        res.json({ success: true, message: `Task ${name} scheduled` });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.delete('/api/schedule/:name', (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        this.scheduler.stop(name);
        res.json({ success: true, message: `Task ${name} stopped` });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/schedule', (req: Request, res: Response) => {
      try {
        const tasks = this.scheduler.getActiveTasks();
        res.json({ success: true, data: tasks });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/config', (req: Request, res: Response) => {
      try {
        const config = this.db.getAllConfig();
        res.json({ success: true, data: config });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/config', (req: Request, res: Response) => {
      try {
        const { key, value } = req.body;

        if (!key || !value) {
          return res.status(400).json({ error: 'key and value are required' });
        }

        this.db.setConfig(key, value);

        // NOTE_API_TOKENが更新された場合、noteClientも更新
        if (key === 'NOTE_API_TOKEN') {
          this.noteClient.updateToken(value);
          console.log('✅ Note API token updated');
        }

        res.json({ success: true, message: 'Config updated' });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  start(port: number = 3000) {
    this.app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  }
}
