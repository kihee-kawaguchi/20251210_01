import Database from 'better-sqlite3';
import { ScrapingTask, PostHistory, AppConfig } from '../types/index.js';
import path from 'path';

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string = './data/app.db') {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scraping_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS post_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        note_url TEXT NOT NULL,
        note_id TEXT NOT NULL,
        title TEXT NOT NULL,
        posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES scraping_tasks(id)
      );

      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_task_status ON scraping_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_task_created ON scraping_tasks(created_at);
    `);
  }

  createTask(url: string): number {
    const stmt = this.db.prepare('INSERT INTO scraping_tasks (url, status) VALUES (?, ?)');
    const result = stmt.run(url, 'pending');
    return result.lastInsertRowid as number;
  }

  getTask(id: number): ScrapingTask | null {
    const stmt = this.db.prepare('SELECT * FROM scraping_tasks WHERE id = ?');
    const row: any = stmt.get(id);

    if (!row) return null;

    return {
      id: row.id,
      url: row.url,
      status: row.status,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      errorMessage: row.error_message
    };
  }

  getAllTasks(status?: string): ScrapingTask[] {
    let stmt;
    let rows: any[];

    if (status) {
      stmt = this.db.prepare('SELECT * FROM scraping_tasks WHERE status = ? ORDER BY created_at DESC');
      rows = stmt.all(status);
    } else {
      stmt = this.db.prepare('SELECT * FROM scraping_tasks ORDER BY created_at DESC');
      rows = stmt.all();
    }

    return rows.map(row => ({
      id: row.id,
      url: row.url,
      status: row.status,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      errorMessage: row.error_message
    }));
  }

  updateTaskStatus(id: number, status: string, errorMessage?: string) {
    const completedAt = status === 'completed' || status === 'failed' ? new Date().toISOString() : null;
    const stmt = this.db.prepare(
      'UPDATE scraping_tasks SET status = ?, completed_at = ?, error_message = ? WHERE id = ?'
    );
    stmt.run(status, completedAt, errorMessage || null, id);
  }

  createPostHistory(taskId: number, noteUrl: string, noteId: string, title: string): number {
    const stmt = this.db.prepare(
      'INSERT INTO post_history (task_id, note_url, note_id, title) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(taskId, noteUrl, noteId, title);
    return result.lastInsertRowid as number;
  }

  getPostHistory(limit: number = 50): PostHistory[] {
    const stmt = this.db.prepare(`
      SELECT * FROM post_history
      ORDER BY posted_at DESC
      LIMIT ?
    `);
    const rows: any[] = stmt.all(limit);

    return rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      noteUrl: row.note_url,
      noteId: row.note_id,
      title: row.title,
      postedAt: new Date(row.posted_at)
    }));
  }

  setConfig(key: string, value: string) {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)'
    );
    stmt.run(key, value);
  }

  getConfig(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM app_config WHERE key = ?');
    const row: any = stmt.get(key);
    return row ? row.value : null;
  }

  getAllConfig(): Record<string, string> {
    const stmt = this.db.prepare('SELECT key, value FROM app_config');
    const rows: any[] = stmt.all();

    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return config;
  }

  close() {
    this.db.close();
  }
}
