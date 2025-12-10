import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { ScrapedContent, ImageData } from '../types/index.js';

export class WebScraper {
  private usePuppeteer: boolean;

  constructor(usePuppeteer: boolean = false) {
    this.usePuppeteer = usePuppeteer;
  }

  async scrape(url: string): Promise<ScrapedContent> {
    if (this.usePuppeteer) {
      return await this.scrapeWithPuppeteer(url);
    } else {
      return await this.scrapeWithCheerio(url);
    }
  }

  private async scrapeWithCheerio(url: string): Promise<ScrapedContent> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      });

      const html = response.data;
      const $ = cheerio.load(html);

      const title = this.extractTitle($);
      const content = this.extractContent($);
      const images = await this.extractImages($, url);
      const metadata = this.extractMetadata($);

      return {
        url,
        title,
        content,
        html,
        images,
        metadata,
        scrapedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to scrape ${url}: ${error}`);
    }
  }

  private async scrapeWithPuppeteer(url: string): Promise<ScrapedContent> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const html = await page.content();
      const $ = cheerio.load(html);

      const title = await page.title() || this.extractTitle($);
      const content = this.extractContent($);
      const images = await this.extractImages($, url);
      const metadata = this.extractMetadata($);

      return {
        url,
        title,
        content,
        html,
        images,
        metadata,
        scrapedAt: new Date()
      };
    } finally {
      await browser.close();
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    return (
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      'Untitled'
    );
  }

  private extractContent($: cheerio.CheerioAPI): string {
    $('script, style, nav, header, footer, aside').remove();

    const contentSelectors = [
      'article',
      'main',
      '.content',
      '.post-content',
      '.entry-content',
      '#content',
      'body'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim().replace(/\s+/g, ' ');
      }
    }

    return $('body').text().trim().replace(/\s+/g, ' ');
  }

  private async extractImages($: cheerio.CheerioAPI, baseUrl: string): Promise<ImageData[]> {
    const images: ImageData[] = [];
    const seenUrls = new Set<string>();

    $('img').each((_, elem) => {
      const src = $(elem).attr('src');
      const alt = $(elem).attr('alt') || '';

      if (src) {
        const absoluteUrl = this.toAbsoluteUrl(src, baseUrl);

        if (absoluteUrl && !seenUrls.has(absoluteUrl)) {
          seenUrls.add(absoluteUrl);

          if (this.isValidImageUrl(absoluteUrl)) {
            images.push({
              url: absoluteUrl,
              alt
            });
          }
        }
      }
    });

    return images;
  }

  private extractMetadata($: cheerio.CheerioAPI): { author?: string; publishDate?: string; tags?: string[] } {
    const author =
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('.author').first().text().trim() ||
      undefined;

    const publishDate =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="publish_date"]').attr('content') ||
      $('time').first().attr('datetime') ||
      undefined;

    const tags: string[] = [];
    $('meta[property="article:tag"]').each((_, elem) => {
      const tag = $(elem).attr('content');
      if (tag) tags.push(tag);
    });

    return { author, publishDate, tags: tags.length > 0 ? tags : undefined };
  }

  private toAbsoluteUrl(url: string, baseUrl: string): string | null {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return null;
    }
  }

  private isValidImageUrl(url: string): boolean {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
    return imageExtensions.test(url) || url.includes('image');
  }

  async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download image ${url}: ${error}`);
    }
  }
}
