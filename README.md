# WhatsApp API Service

WhatsApp messaging API for Render deployment.

## Deploy to Render

1. Create new GitHub repo and push this folder
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" → "Web Service"
4. Connect your GitHub repo
5. Select "Docker" environment
6. Set environment variable: `API_KEY` = your-secret-key
7. Click "Create Web Service"

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check (for UptimeRobot) |
| `/api/status` | GET | Get connection status |
| `/api/qr` | GET | Get QR code for scanning |
| `/api/send` | POST | Send message |
| `/api/logout` | POST | Logout WhatsApp |

## Authentication

All `/api/*` endpoints require `X-API-KEY` header.

## Send Message Example

```javascript
fetch('https://your-render-url.onrender.com/api/send', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': 'your-api-key'
    },
    body: JSON.stringify({
        phone: '919876543210',
        message: 'Hello from WhatsApp API!'
    })
});
```

## UptimeRobot Setup

1. Create account at https://uptimerobot.com
2. Add new monitor
3. Type: HTTP(s)
4. URL: https://your-render-url.onrender.com
5. Interval: 5 minutes

This keeps the free tier service running 24/7!
