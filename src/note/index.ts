import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { NoteArticle, NoteAPIResponse, ScrapedContent } from '../types/index.js';

export class NoteClient {
  private client: AxiosInstance;
  private apiToken: string;

  constructor(apiToken: string, baseUrl: string = 'https://note.com/api/v2') {
    this.apiToken = apiToken;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
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

  async scrapeAndPost(
    url: string,
    scraper: any,
    autoPublish: boolean = false
  ): Promise<NoteAPIResponse> {
    console.log(`Scraping ${url}...`);
    const scraped = await scraper.scrape(url);

    console.log('Downloading images...');
    for (const image of scraped.images) {
      try {
        image.buffer = await scraper.downloadImage(image.url);
      } catch (error) {
        console.error(`Failed to download ${image.url}:`, error);
      }
    }

    console.log('Converting to note article...');
    const article = await this.convertScrapedToArticle(scraped, true);

    if (autoPublish) {
      article.status = 'publish';
    }

    console.log('Posting to note...');
    return await this.createArticle(article);
  }
}
