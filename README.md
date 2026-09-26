
# 🏥 Pharmis Optimus Nexus

> **Advancing Pharmaceutical Knowledge, Research, and Innovation — connecting scientists, clinicians, and visionaries worldwide.**

[![Node.js](https://img.shields.io/badge/Node.js-24.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black.svg)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 About

**Pharmis Optimus Nexus** is a public health–driven platform founded by passionate pharmacy students committed to promoting health awareness, pharmaceutical knowledge, and community impact. Our mission is to educate, inform, and inspire individuals through evidence-based health information, research discussions, and public health advocacy.

### 🎯 What We Do

- 📚 **Publish Research Articles** — Peer-reviewed research on pharmaceutical topics
- ✍️ **Share Health Insights** — Blog posts on public health awareness
- 💬 **Engage Community** — Enable likes, comments, and discussions
- 👁️ **Track Analytics** — Monitor view counts and engagement metrics
- 📧 **Stay Connected** — Newsletter subscriptions and contact forms

---

## 🚀 Live Demo

**Production URL:** [https://pharmisoptimusnexus.vercel.app](https://pharmisoptimusnexus.vercel.app)

---

## ✨ Features

### Content Management
- ✅ **Dynamic Content from Google Sheets** — Easy content management via spreadsheets
- ✅ **Structured JSON Content** — Rich text formatting (headings, lists, notes, quotes, tables)
- ✅ **Auto-sync** — Scheduled content synchronization
- ✅ **SEO Optimized** — Dynamic meta tags, Open Graph, structured data

### User Engagement
- ✅ **Like System** — Session-based likes with real-time counter
- ✅ **Comment System** — Nested comments with replies
- ✅ **View Tracking** — Unique view counts per session
- ✅ **Contact Form** — Email notifications via Nodemailer

### Design & UX
- ✅ **Dark/Light Theme** — Toggle with saved preference
- ✅ **Responsive Design** — Optimized for mobile, tablet, and desktop
- ✅ **Hero Slideshow** — Auto-playing carousel with fallback images
- ✅ **Scroll Animations** — Reveal animations as you scroll
- ✅ **Loading States** — Skeleton loaders and spinners

### Performance & Security
- ✅ **In-Memory Caching** — NodeCache for fast page loads
- ✅ **Rate Limiting** — Prevent abuse on API endpoints
- ✅ **Security Headers** — Helmet.js for HTTP security
- ✅ **XSS Protection** — Input sanitization
- ✅ **CORS Configuration** — Domain-restricted API access

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                │
│                    (https://pharmisoptimusnexus.vercel.app)         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EXPRESS SERVER                              │
│                            server.js                                │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Middleware Stack                           │ │
│  │  Helmet → CORS → Compression → Session → Static Files        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                    │                                │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Routes (web.js, api.js)                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                    │                                │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Controllers (Business Logic)               │ │
│  │  homeController │ blogController │ publicationsController     │ │
│  │  apiController                                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                    │                                │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Models (Database Access)                   │ │
│  │  Post │ Comment │ Like │ View                                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                    │                                │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Services (External Integrations)           │ │
│  │  googleSheetsService │ cacheService │ emailService            │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │      SUPABASE       │         │    GOOGLE SHEETS    │
        │    (PostgreSQL)     │         │   (Content Source)  │
        │                     │         │                     │
        │  Tables:            │         │  Blog Sheet         │
        │  - posts            │         │  Publications Sheet │
        │  - comments         │         │                     │
        │  - likes            │         │                     │
        │  - views            │         │                     │
        │  - sync_log         │         │                     │
        └─────────────────────┘         └─────────────────────┘
```

---

## 🛠️ Tech Stack

| **Category** | **Technology** |
|--------------|----------------|
| **Backend** | Node.js 24.x, Express.js 4.x |
| **Database** | Supabase (PostgreSQL) |
| **Templating** | EJS (Embedded JavaScript) |
| **Styling** | Custom CSS3 (Variables, Grid, Flexbox) |
| **Frontend JS** | Vanilla JavaScript (ES6+) |
| **Caching** | NodeCache (in-memory) |
| **Email** | Nodemailer (Gmail SMTP) |
| **Session** | Express Session |
| **Security** | Helmet, CORS, express-rate-limit |
| **Deployment** | Vercel |

---

## 📁 Project Structure

```
pharmisoptimusnexus/
├── 📄 server.js                    # Application entry point
├── 📄 package.json                 # Dependencies and scripts
├── 📄 vercel.json                  # Vercel deployment config
├── 📄 .env                         # Environment variables (not in git)
├── 📄 .gitignore                   # Git ignore rules
├── 📄 README.md                    # This file
│
├── 📁 src/
│   ├── 📁 config/                  # Configuration files
│   │   ├── index.js                # Main config
│   │   ├── supabase.js             # Supabase client setup
│   │   └── session.js              # Session configuration
│   │
│   ├── 📁 controllers/             # Business logic
│   │   ├── index.js                # Controller exports
│   │   ├── homeController.js       # Home, About, Contact
│   │   ├── blogController.js       # Blog listing and posts
│   │   ├── publicationsController.js # Publications
│   │   └── apiController.js        # API endpoints
│   │
│   ├── 📁 models/                  # Database interaction
│   │   ├── index.js                # Model exports
│   │   ├── Post.js                 # Post operations
│   │   ├── Comment.js              # Comment operations
│   │   ├── Like.js                 # Like operations
│   │   └── View.js                 # View operations
│   │
│   ├── 📁 routes/                  # URL routing
│   │   ├── index.js                # Route exports
│   │   ├── web.js                  # Frontend routes
│   │   └── api.js                  # API routes
│   │
│   ├── 📁 services/                # External services
│   │   ├── index.js                # Service exports
│   │   ├── googleSheetsService.js  # Google Sheets sync
│   │   ├── cacheService.js         # Caching
│   │   ├── emailService.js         # Email sending
│   │   └── analyticsService.js     # Analytics
│   │
│   ├── 📁 middleware/              # Request processing
│   │   ├── auth.js                 # Authentication
│   │   ├── cache.js                # Caching middleware
│   │   ├── rateLimiter.js          # Rate limiting
│   │   ├── logger.js               # Request logging
│   │   ├── errorHandler.js         # Error handling
│   │   └── security.js             # Security middleware
│   │
│   ├── 📁 utils/                   # Helper functions
│   │   ├── slugify.js              # URL slug generation
│   │   ├── helpers.js              # General helpers
│   │   ├── validation.js           # Input validation
│   │   └── constants.js            # Constant values
│   │
│   ├── 📁 database/                # Database migrations
│   │   ├── 📁 migrations/
│   │   │   ├── 001_initial_schema.sql
│   │   │   ├── 002_add_functions.sql
│   │   │   └── 003_add_indexes.sql
│   │   └── migrate.js              # Migration runner
│   │
│   ├── 📁 views/                   # EJS templates
│   │   ├── 📁 layouts/
│   │   │   └── main.ejs            # Base layout
│   │   ├── 📁 partials/            # Reusable pieces
│   │   │   ├── header.ejs
│   │   │   ├── footer.ejs
│   │   │   ├── sidebar.ejs
│   │   │   ├── pagination.ejs
│   │   │   └── hero-mini.ejs
│   │   ├── 📁 components/          # Interactive components
│   │   │   ├── comments.ejs
│   │   │   ├── likes.ejs
│   │   │   ├── related-posts.ejs
│   │   │   └── social-share.ejs
│   │   └── 📁 pages/               # Full pages
│   │       ├── home.ejs
│   │       ├── blog.ejs
│   │       ├── blog-post.ejs
│   │       ├── publications.ejs
│   │       ├── publication.ejs
│   │       ├── about.ejs
│   │       ├── contact.ejs
│   │       └── error.ejs
│   │
│   └── 📁 public/                  # Static files
│       ├── 📁 css/
│       │   ├── main.css
│       │   ├── home.css
│       │   ├── blog.css
│       │   ├── publications.css
│       │   ├── about.css
│       │   ├── contact.css
│       │   └── comments.css
│       ├── 📁 js/
│       │   ├── main.js
│       │   ├── comments.js
│       │   └── likes.js
│       └── 📁 images/
│           ├── Classlogo.png
│           └── og-image.jpg
│
└── 📁 scripts/                     # Utility scripts
    ├── test-supabase.js            # Test database connection
    ├── test-api.js                 # Test API endpoints
    ├── test-performance.js         # Test page load times
    ├── test-security.js            # Test security
    ├── test-email.js               # Test email
    ├── sync-data.js                # Manual sync
    └── generate-secret.js          # Generate session secret
```

---

## 🚦 Getting Started

### Prerequisites

- **Node.js** v18.x or higher (v24.x recommended)
- **npm** or **yarn**
- **Supabase account** ([sign up free](https://supabase.com))
- **Google Account** (for Google Sheets)
- **Gmail App Password** (for email notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/icedove2023/pharmisoptimusnexus.git
   cd pharmisoptimusnexus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials (see [Environment Variables](#-environment-variables))

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run migrations from `src/database/migrations/` in SQL Editor
   - Get your API keys from Project Settings

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```



### Generating Session Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 📊 Database Schema

### Tables

| **Table** | **Purpose** | **Key Columns** |
|-----------|-------------|-----------------|
| `posts` | Blog posts & publications | id, title, slug, content, category, tags, views, likes |
| `comments` | User comments | id, post_id, author, content, parent_id |
| `likes` | Post likes | id, post_id, session_id, ip_address |
| `views` | View tracking | id, post_id, session_id, ip_address, referrer |
| `sync_log` | Sync history | id, operation, status, records_processed |

### Database Functions

- `increment_views(post_id)` — Increment view count
- `toggle_like(post_id, session_id, ip_address)` — Toggle like state
- `get_popular_posts(limit_count)` — Get most popular posts
- `sync_posts(...)` — Upsert posts during sync

---

## 📝 Content Format (JSON)

Blog posts and publications use a structured JSON format:

```json
{
  "sections": [
    {
      "type": "heading",
      "level": 2,
      "text": "Introduction"
    },
    {
      "type": "paragraph",
      "text": "Your paragraph text here."
    },
    {
      "type": "list",
      "ordered": false,
      "items": ["Item 1", "Item 2"]
    },
    {
      "type": "note",
      "variant": "info",
      "text": "Important information."
    },
    {
      "type": "quote",
      "text": "A memorable quote.",
      "source": "Author Name"
    },
    {
      "type": "table",
      "headers": ["Column 1", "Column 2"],
      "rows": [["Data 1", "Data 2"]]
    }
  ],
  "references": [
    {
      "authors": "Author, A.",
      "year": 2026,
      "title": "Article Title",
      "source": "Journal Name",
      "url": "https://example.com"
    }
  ]
}
```

### Available Text Styles

| **Type** | **Properties** | **Example** |
|----------|----------------|-------------|
| `heading` | `level` (1-4), `text` | Section headings |
| `paragraph` | `text` | Regular text |
| `list` | `ordered`, `items[]` | Bullet or numbered lists |
| `note` | `variant` (info/warning/danger), `text` | Callout boxes |
| `quote` | `text`, `source` | Blockquotes |
| `image` | `src`, `caption` | Images with captions |
| `table` | `headers[]`, `rows[][]` | Data tables |
| `hr` | — | Horizontal divider |

---

## 🎯 API Endpoints

### Public API

| **Method** | **Endpoint** | **Description** |
|------------|--------------|-----------------|
| `GET` | `/api/hero-slides` | Get hero slideshow images |
| `GET` | `/api/likes/:postId` | Get like count for a post |
| `POST` | `/api/likes/:postId` | Toggle like on a post |
| `GET` | `/api/comments/:postId` | Get comments for a post |
| `POST` | `/api/comments/:postId` | Add a comment |
| `POST` | `/api/views/:postId` | Track a view |
| `GET` | `/api/views/:postId` | Get view count |
| `GET` | `/api/analytics/popular` | Get popular posts |
| `POST` | `/api/contact` | Submit contact form |
| `POST` | `/api/theme` | Save theme preference |

### Health Check

| **Method** | **Endpoint** | **Description** |
|------------|--------------|-----------------|
| `GET` | `/health` | Server health status |

---

## 🧪 Testing

```bash
# Test database connection
npm run test:db

# Test API endpoints
npm run test:api

# Test performance
npm run test:performance

# Test security
npm run test:security

# Test email configuration
npm run test:email

# Sync data from Google Sheets
npm run sync
```

---

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **Deploy via Vercel CLI**
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

3. **Or Deploy via Vercel Dashboard**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables
   - Click "Deploy"

### Environment Variables on Vercel

Add all variables from `.env` in Vercel Dashboard:
- Project Settings → Environment Variables
- Add each variable individually
- Redeploy after adding

---

## 🔧 Available Scripts

| **Script** | **Command** | **Description** |
|------------|-------------|-----------------|
| Start | `npm start` | Start production server |
| Dev | `npm run dev` | Start development server with nodemon |
| Build | `npm run build` | Install production dependencies |
| Test DB | `npm run test:db` | Test Supabase connection |
| Test API | `npm run test:api` | Test API endpoints |
| Test Perf | `npm run test:performance` | Test page load times |
| Test Security | `npm run test:security` | Test security features |
| Test Email | `npm run test:email` | Test email configuration |
| Sync | `npm run sync` | Sync data from Google Sheets |

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Contribution Guidelines

- Follow the existing code style
- Write clear commit messages
- Update documentation as needed
- Test your changes before submitting

---

## 📋 Roadmap

- [x] Homepage with hero slideshow
- [x] Blog with filtering and search
- [x] Publications section
- [x] Like and comment system
- [x] View tracking
- [x] Google Sheets integration
- [x] Email notifications
- [x] Dark/Light theme
- [x] Responsive design
- [ ] User authentication
- [ ] Admin dashboard
- [ ] Newsletter system
- [ ] Multi-language support
- [ ] PWA support

---

## 🐛 Known Issues

- None reported at this time. Please [open an issue](https://github.com/icedove2023/pharmisoptimusnexus/issues) if you find one.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Pharmis Optimus Nexus Team**

- **Adetokunbo Johnson** — Founder & Lead Developer
- **Pharmis Optimus Nexus** — Research & Content

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) — Database infrastructure
- [Vercel](https://vercel.com/) — Hosting platform
- [Google Sheets API](https://developers.google.com/sheets/api) — Content management
- [Express.js](https://expressjs.com/) — Web framework
- [EJS](https://ejs.co/) — Templating engine
- [Nodemailer](https://nodemailer.com/) — Email service
- [Helmet.js](https://helmetjs.github.io/) — Security middleware

---

## 📞 Contact

- **Email:** pharmisoptimusofficials@gmail.com
- **Website:** [pharmisoptimusnexus.vercel.app](https://pharmisoptimusnexus.vercel.app)
- **GitHub:** [@icedove2023](https://github.com/icedove2023)
- **TikTok:** [@pharmis_optimus](https://www.tiktok.com/@pharmis_optimus)
- **Instagram:** [@pharmis_optimus](https://www.instagram.com/pharmis_optimus)

---

## 🌟 Support

If you find this project helpful, please give it a ⭐️ on GitHub!

---

**Made with ❤️ by Pharmis Optimus Nexus**

*Advancing Pharmaceutical Knowledge, Research, and Innovation*

---

## 📌 Quick Links

| **Resource** | **Link** |
|--------------|----------|
| 🌐 Live Site | [pharmisoptimusnexus.vercel.app](https://pharmisoptimusnexus.vercel.app) |
| 📊 Supabase Dashboard | [app.supabase.com](https://app.supabase.com) |
| 🚀 Vercel Dashboard | [vercel.com/dashboard](https://vercel.com/dashboard) |
| 📝 Google Sheets | [sheets.google.com](https://sheets.google.com) |
| 🐛 Report Issues | [GitHub Issues](https://github.com/icedove2023/pharmisoptimusnexus/issues) |

---

**© 2026 Pharmis Optimus Nexus. All Rights Reserved.**
