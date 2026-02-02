# lui.re URL Shortener

A simple, clean URL shortener for the lui.re domain.

## Features

- 🎯 **Clean Interface** - Modern, responsive design
- ⚡ **Fast Redirects** - Instant 301 redirects to original URLs
- 🎨 **Custom Codes** - Choose your own short codes or get random ones
- 📊 **Click Tracking** - Track how many times each link is clicked
- 💾 **SQLite Database** - Simple, file-based database (no separate DB server needed)
- 🔒 **HTTPS Ready** - Works with Azure's free SSL certificates

## Quick Start (Local Development)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **Visit in browser**
   ```
   http://localhost:3000
   ```

## Project Structure

```
url-shortener/
├── src/
│   └── server.js          # Backend server with API and redirect logic
├── public/
│   └── index.html         # Frontend interface
├── package.json           # Dependencies and scripts
├── DEPLOYMENT_GUIDE.md    # Complete Azure deployment instructions
└── README.md             # This file
```

## API Endpoints

### Create Short URL
```
POST /api/shorten
Content-Type: application/json

{
  "url": "https://example.com/long/url",
  "customCode": "mycode"  // optional
}

Response:
{
  "shortUrl": "https://lui.re/mycode",
  "shortCode": "mycode"
}
```

### Get Statistics
```
GET /api/stats/:shortCode

Response:
{
  "original_url": "https://example.com/long/url",
  "created_at": "2024-01-15 10:30:00",
  "click_count": 42
}
```

### Redirect
```
GET /:shortCode

Response: 301 Redirect to original URL
```

## Database Schema

```sql
CREATE TABLE urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  short_code TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  click_count INTEGER DEFAULT 0
);
```

## Environment Variables

- `PORT` - Server port (default: 3000)

## Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete Azure deployment instructions including:
- Azure App Service setup
- DNS configuration
- SSL certificate setup
- Custom domain configuration

## Technologies Used

- **Backend**: Node.js, Express
- **Database**: SQLite3
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Hosting**: Azure App Service

## Security Notes

- URL validation prevents invalid URLs
- Short codes are alphanumeric only (a-z, A-Z, 0-9, -, _)
- 301 redirects are used for SEO benefits
- Database uses parameterized queries to prevent SQL injection

## Future Enhancements

Potential features to add:
- [ ] Admin panel for managing URLs
- [ ] URL expiration dates
- [ ] QR code generation
- [ ] Analytics dashboard
- [ ] Password-protected links
- [ ] Rate limiting for abuse prevention
- [ ] Link preview before redirect

## License

MIT
