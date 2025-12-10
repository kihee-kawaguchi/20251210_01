export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  html: string;
  images: ImageData[];
  metadata: {
    author?: string;
    publishDate?: string;
    tags?: string[];
  };
  scrapedAt: Date;
}

export interface ImageData {
  url: string;
  alt?: string;
  localPath?: string;
  buffer?: Buffer;
}

export interface NoteArticle {
  title: string;
  body: string;
  status?: 'draft' | 'publish';
  publishAt?: string;
  eyecatch?: string;
  hashtags?: string[];
}

export interface NoteAPIResponse {
  success: boolean;
  data?: {
    id: string;
    url: string;
    noteId: string;
  };
  error?: string;
}

export interface ScrapingTask {
  id: number;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface PostHistory {
  id: number;
  taskId: number;
  noteUrl: string;
  noteId: string;
  title: string;
  postedAt: Date;
}

export interface AppConfig {
  noteApiToken: string;
  noteBaseUrl: string;
  scrapingSchedule?: string;
  autoPost: boolean;
}
