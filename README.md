# Web Scraper to Note

サイトスクレイピング → noteマークダウンエクスポートアプリ

Webサイトからコンテンツをスクレイピングし、note形式のマークダウンファイルとして保存するアプリケーション。
Google Apps Scriptアプリの上位互換として、より強力な機能と柔軟性を提供します。

## 主な機能

- **Webスクレイピング**: 任意のURLからコンテンツと画像を自動取得
- **マークダウンエクスポート**: 取得したコンテンツをnote形式のマークダウンファイルとして保存
  - note公式APIは一般公開されていないため、マークダウンファイルをダウンロードしてnoteに手動で貼り付けます
  - タイトル、本文、画像リンク、メタ情報（著者、公開日、タグ）を含む完全なマークダウン
  - 元記事のリンクと著作権注意書きを自動挿入
- **画像処理**: 複数画像のURLを抽出してマークダウンに埋め込み
- **スケジュール実行**: Cron式による定期実行
- **管理UI**: ブラウザベースの直感的な管理画面
- **投稿履歴**: 全てのスクレイピング結果を記録・ダウンロード可能
- **ダウンロード機能**: 投稿履歴からワンクリックでマークダウンファイルをダウンロード

## Getting Started

### Prerequisites

```bash
# Set environment variables
cp .env.example .env
# Edit .env and add your tokens
```

### Installation

```bash
npm install
```

### Usage

```bash
# Start the server
npm run dev

# Open browser
# Navigate to http://localhost:3000

# Or use custom port
PORT=8080 npm run dev
```

管理画面が起動したら:

1. **スクレイピング実行タブ**
   - URLを入力してスクレイピング開始
   - 自動公開のチェックボックスで公開/下書きを選択

2. **タスク一覧タブ**
   - 実行中・完了したタスクの確認

3. **投稿履歴タブ**
   - noteに投稿した記事の履歴確認

4. **スケジュール管理タブ**
   - 定期実行の設定（Cron式を使用）
   - 例: `0 9 * * *` = 毎日9時に実行

### API Endpoints

```bash
# スクレイピング & 投稿
POST /api/scrape
Body: { "url": "https://example.com", "autoPublish": false }

# タスク一覧取得
GET /api/tasks

# 投稿履歴取得
GET /api/history

# スケジュール登録
POST /api/schedule
Body: { "name": "daily", "cronExpression": "0 9 * * *", "url": "...", "autoPublish": false }
```

### Development

```bash
npm run build        # Build project
npm test             # Run tests
npm run typecheck    # Check types
npm run lint         # Lint code
```

## Project Structure

```
20251210_01/
├── src/
│   ├── scraper/         # Webスクレイピング機能
│   │   └── index.ts     # Puppeteer/Cheerioベースのスクレイパー
│   ├── note/            # note API連携
│   │   └── index.ts     # 記事投稿・画像アップロード
│   ├── database/        # データベース管理
│   │   └── index.ts     # SQLite (better-sqlite3)
│   ├── scheduler/       # スケジューラー
│   │   └── index.ts     # Cron式による定期実行
│   ├── api/             # REST API
│   │   └── index.ts     # Express APIサーバー
│   ├── public/          # フロントエンド
│   │   └── index.html   # 管理UI
│   ├── types/           # TypeScript型定義
│   │   └── index.ts
│   └── index.ts         # メインエントリーポイント
├── data/                # データベースファイル (自動生成)
│   └── app.db
├── tests/               # テストコード
├── .env                 # 環境変数設定
└── package.json
```

## Miyabi Framework

This project uses **7 autonomous AI agents**:

1. **CoordinatorAgent** - Task planning & orchestration
2. **IssueAgent** - Automatic issue analysis & labeling
3. **CodeGenAgent** - AI-powered code generation
4. **ReviewAgent** - Code quality validation (80+ score)
5. **PRAgent** - Automatic PR creation
6. **DeploymentAgent** - CI/CD deployment automation
7. **TestAgent** - Test execution & coverage

### Workflow

1. **Create Issue**: Describe what you want to build
2. **Agents Work**: AI agents analyze, implement, test
3. **Review PR**: Check generated pull request
4. **Merge**: Automatic deployment

### Label System

Issues transition through states automatically:

- `📥 state:pending` - Waiting for agent assignment
- `🔍 state:analyzing` - Being analyzed
- `🏗️ state:implementing` - Code being written
- `👀 state:reviewing` - Under review
- `✅ state:done` - Completed & merged

## Commands

```bash
# Check project status
npx miyabi status

# Watch for changes (real-time)
npx miyabi status --watch

# Create new issue
gh issue create --title "Add feature" --body "Description"
```

## Configuration

### Environment Variables

Required variables (see `.env.example`):

- `GITHUB_TOKEN` - GitHub personal access token
- `ANTHROPIC_API_KEY` - Claude API key (optional for local development)
- `REPOSITORY` - Format: `owner/repo`

### GitHub Actions

Workflows are pre-configured in `.github/workflows/`:

- CI/CD pipeline
- Automated testing
- Deployment automation
- Agent execution triggers

**Note**: Set repository secrets at:
`https://github.com/kihee-kawaguchi/20251210_01/settings/secrets/actions`

Required secrets:
- `GITHUB_TOKEN` (auto-provided by GitHub Actions)
- `ANTHROPIC_API_KEY` (add manually for agent execution)

## Documentation

- **Miyabi Framework**: https://github.com/ShunsukeHayashi/Miyabi
- **NPM Package**: https://www.npmjs.com/package/miyabi
- **Label System**: See `.github/labels.yml`
- **Agent Operations**: See `CLAUDE.md`

## Support

- **Issues**: https://github.com/ShunsukeHayashi/Miyabi/issues
- **Discord**: [Coming soon]

## License

MIT

---

✨ Generated by [Miyabi](https://github.com/ShunsukeHayashi/Miyabi)
