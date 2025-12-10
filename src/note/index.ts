import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { NoteArticle, NoteAPIResponse, ScrapedContent } from '../types/index.js';

export class NoteClient {
  private client: AxiosInstance;
  private apiToken: string;
  private baseUrl: string;

  constructor(apiToken: string, baseUrl: string = 'https://note.com/api/v2') {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  updateToken(newToken: string) {
    this.apiToken = newToken;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  async uploadImage(imageBuffer: Buffer, filename: string): Promise<string> {
    const formData = new FormData();
    formData.append('image', imageBuffer, filename);

    try {
      const response = await this.client.post('/images', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      return response.data.data.url;
    } catch (error: any) {
      console.error('Failed to upload image:', error.response?.data || error.message);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  async createArticle(article: NoteArticle): Promise<NoteAPIResponse> {
    try {
      const response = await this.client.post('/notes', {
        name: article.title,
        body: article.body,
        status: article.status || 'draft',
        publish_at: article.publishAt,
        eyecatch: article.eyecatch,
        hashtags: article.hashtags
      });

      return {
        success: true,
        data: {
          id: response.data.data.id,
          url: response.data.data.note_url,
          noteId: response.data.data.key
        }
      };
    } catch (error: any) {
      console.error('Failed to create article:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async updateArticle(noteId: string, article: Partial<NoteArticle>): Promise<NoteAPIResponse> {
    try {
      const response = await this.client.put(`/notes/${noteId}`, {
        name: article.title,
        body: article.body,
        status: article.status,
        publish_at: article.publishAt,
        eyecatch: article.eyecatch,
        hashtags: article.hashtags
      });

      return {
        success: true,
        data: {
          id: response.data.data.id,
          url: response.data.data.note_url,
          noteId: response.data.data.key
        }
      };
    } catch (error: any) {
      console.error('Failed to update article:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async convertScrapedToArticle(
    scraped: ScrapedContent,
    downloadImages: boolean = true
  ): Promise<NoteArticle> {
    let body = scraped.content;
    const uploadedImages: string[] = [];

    if (downloadImages && scraped.images.length > 0) {
      console.log(`Uploading ${scraped.images.length} images...`);

      for (let i = 0; i < Math.min(scraped.images.length, 10); i++) {
        const image = scraped.images[i];
        try {
          if (image.buffer) {
            const filename = `image_${i}.jpg`;
            const imageUrl = await this.uploadImage(image.buffer, filename);
            uploadedImages.push(imageUrl);
            body += `\n\n![${image.alt || ''}](${imageUrl})`;
          }
        } catch (error) {
          console.error(`Failed to upload image ${i}:`, error);
        }
      }
    }

    body += `\n\n---\n\n元記事: ${scraped.url}`;

    if (scraped.metadata.author) {
      body += `\n著者: ${scraped.metadata.author}`;
    }

    if (scraped.metadata.publishDate) {
      body += `\n公開日: ${scraped.metadata.publishDate}`;
    }

    return {
      title: scraped.title,
      body,
      status: 'draft',
      hashtags: scraped.metadata.tags,
      eyecatch: uploadedImages.length > 0 ? uploadedImages[0] : undefined
    };
  }

  async scrapeAndExport(
    url: string,
    scraper: any
  ): Promise<{ success: boolean; markdown?: string; filepath?: string; error?: string }> {
    try {
      console.log(`Scraping ${url}...`);
      const scraped = await scraper.scrape(url);

      console.log('Creating markdown...');
      let markdown = `# ${scraped.title}\n\n`;
      markdown += `${scraped.content}\n\n`;

      // 画像リンク追加
      if (scraped.images.length > 0) {
        markdown += `\n## 画像\n\n`;
        scraped.images.slice(0, 10).forEach((img: any, idx: number) => {
          markdown += `![画像${idx + 1}](${img.url})\n\n`;
        });
      }

      // メタ情報
      markdown += `\n---\n\n`;
      markdown += `**元記事:** ${scraped.url}\n\n`;

      if (scraped.metadata.author) {
        markdown += `**著者:** ${scraped.metadata.author}\n\n`;
      }

      if (scraped.metadata.publishDate) {
        markdown += `**公開日:** ${scraped.metadata.publishDate}\n\n`;
      }

      if (scraped.metadata.tags && scraped.metadata.tags.length > 0) {
        markdown += `**タグ:** ${scraped.metadata.tags.map((t: string) => `#${t}`).join(' ')}\n\n`;
      }

      markdown += `\n> このコンテンツは自動スクレイピングにより取得されました。\n`;
      markdown += `> noteに投稿する際は、著作権に注意してください。\n`;

      // ファイル保存
      const fs = await import('fs');
      const path = await import('path');
      const exportDir = path.join(process.cwd(), 'exports');

      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const filename = `note_${Date.now()}.md`;
      const filepath = path.join(exportDir, filename);

      fs.writeFileSync(filepath, markdown, 'utf8');

      console.log(`✅ Markdown exported to ${filepath}`);

      return {
        success: true,
        markdown,
        filepath: `/exports/${filename}`
      };
    } catch (error: any) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async scrapeAndPost(
    url: string,
    scraper: any,
    autoPublish: boolean = false
  ): Promise<NoteAPIResponse> {
    // マークダウンエクスポートにフォールバック
    console.log('⚠️ Note API is not available. Exporting as markdown instead...');
    const exportResult = await this.scrapeAndExport(url, scraper);

    if (exportResult.success) {
      return {
        success: true,
        data: {
          id: 'exported',
          url: exportResult.filepath || '',
          noteId: 'markdown-export'
        }
      };
    } else {
      return {
        success: false,
        error: exportResult.error || 'Export failed'
      };
    }
  }
}
