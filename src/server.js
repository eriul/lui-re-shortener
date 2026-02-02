const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

// Simple in-memory session store (tokens valid for 24 hours)
const sessions = new Map();

// Initialize SQLite database
const dbPath = process.env.DB_PATH || './urls.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
    db.run(`CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      short_code TEXT UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      click_count INTEGER DEFAULT 0
    )`);
  }
});

// Middleware
app.use(express.json());

// Smart routing based on hostname
app.use((req, res, next) => {
  const hostname = req.hostname || req.get('host');
  
  if (hostname.startsWith('admin.') && req.path === '/') {
    return res.sendFile('admin.html', { root: './public' });
  }
  
  next();
});

app.use(express.static('public'));

// Generate a random short code
function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

// Clean up expired sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of sessions.entries()) {
    if (expiry < now) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000);

// Admin authentication endpoints
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    sessions.set(token, expiry);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true });
});

app.get('/api/admin/check', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const expiry = sessions.get(token);
  const authenticated = expiry && expiry > Date.now();
  res.json({ authenticated });
});

// Middleware to protect admin routes
function requireAdminAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const expiry = sessions.get(token);
  
  if (expiry && expiry > Date.now()) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// API endpoint to create short URL
app.post('/api/shorten', async (req, res) => {
  const { url, customCode } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  let shortCode = customCode || generateShortCode();
  
  if (customCode && !/^[a-zA-Z0-9_-]+$/.test(customCode)) {
    return res.status(400).json({ error: 'Custom code can only contain letters, numbers, hyphens, and underscores' });
  }

  db.run(
    'INSERT INTO urls (short_code, original_url) VALUES (?, ?)',
    [shortCode, url],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          if (customCode) {
            return res.status(400).json({ error: 'Custom code already in use' });
          } else {
            shortCode = generateShortCode();
            db.run(
              'INSERT INTO urls (short_code, original_url) VALUES (?, ?)',
              [shortCode, url],
              function(retryErr) {
                if (retryErr) {
                  return res.status(500).json({ error: 'Failed to create short URL' });
                }
                res.json({ 
                  shortUrl: `https://lui.re/${shortCode}`,
                  shortCode: shortCode
                });
              }
            );
          }
        } else {
          return res.status(500).json({ error: 'Database error' });
        }
      } else {
        res.json({ 
          shortUrl: `https://lui.re/${shortCode}`,
          shortCode: shortCode
        });
      }
    }
  );
});

// API endpoint to get stats for a short code
app.get('/api/stats/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  
  db.get(
    'SELECT original_url, created_at, click_count FROM urls WHERE short_code = ?',
    [shortCode],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Short URL not found' });
      }
      res.json(row);
    }
  );
});

// Admin API: Get all URLs
app.get('/api/admin/urls', requireAdminAuth, (req, res) => {
  db.all(
    'SELECT id, short_code, original_url, created_at, click_count FROM urls ORDER BY created_at DESC',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows || []);
    }
  );
});

// Admin API: Update URL
app.put('/api/admin/urls/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { short_code, original_url } = req.body;
  
  if (!short_code || !original_url) {
    return res.status(400).json({ error: 'Short code and URL are required' });
  }
  
  try {
    new URL(original_url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(short_code)) {
    return res.status(400).json({ error: 'Invalid short code format' });
  }
  
  db.run(
    'UPDATE urls SET short_code = ?, original_url = ? WHERE id = ?',
    [short_code, original_url, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Short code already in use' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'URL not found' });
      }
      res.json({ success: true });
    }
  );
});

// Admin API: Delete URL
app.delete('/api/admin/urls/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM urls WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }
    res.json({ success: true });
  });
});

// Redirect short URL to original URL
app.get('/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  
  if (shortCode.startsWith('api') || shortCode.includes('.')) {
    return res.status(404).send('Not found');
  }
  
  db.get('SELECT original_url FROM urls WHERE short_code = ?', [shortCode], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Server error');
    }
    
    if (!row) {
      return res.status(404).send('Short URL not found');
    }
    
    db.run('UPDATE urls SET click_count = click_count + 1 WHERE short_code = ?', [shortCode]);
    res.redirect(301, row.original_url);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`URL shortener running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    }
    process.exit(0);
  });
});
