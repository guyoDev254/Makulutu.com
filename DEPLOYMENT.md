# Deployment Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- MegaPay API credentials
- Domain name (for production)
- SSL certificate (for HTTPS)

## Backend Deployment

### Option 1: Using PM2 (Recommended)

1. **Install PM2 globally:**
```bash
npm install -g pm2
```

2. **Build the application:**
```bash
cd backend
npm install
npm run build
```

3. **Create PM2 ecosystem file** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'gamer-portfolio-backend',
    script: './dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
```

4. **Start with PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 2: Using Docker

1. **Create Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
```

2. **Build and run:**
```bash
docker build -t gamer-portfolio-backend .
docker run -p 3001:3001 --env-file .env gamer-portfolio-backend
```

### Option 3: Deploy to Cloud Platforms

#### Heroku
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

#### Railway
1. Connect your GitHub repository
2. Add PostgreSQL database
3. Set environment variables
4. Deploy

#### AWS/EC2
1. Launch EC2 instance
2. Install Node.js and PostgreSQL
3. Clone repository
4. Set up PM2 or systemd service
5. Configure Nginx reverse proxy

## Frontend Deployment

### Option 1: Vercel (Recommended for Next.js)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
cd frontend
vercel
```

3. **Set environment variables in Vercel dashboard:**
- `NEXT_PUBLIC_API_URL`: Your backend API URL

### Option 2: Netlify

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables

### Option 3: Self-hosted

1. **Build:**
```bash
cd frontend
npm install
npm run build
```

2. **Start:**
```bash
npm start
```

3. **Use PM2:**
```bash
pm2 start npm --name "frontend" -- start
```

## Environment Variables

### Backend Production `.env`
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# MegaPay
MEGAPAY_API_KEY=your_production_key
MEGAPAY_EMAIL=your_email@example.com
MEGAPAY_BASE_URL=https://megapay.co.ke/backend/v1

# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Webhook (Production URL)
WEBHOOK_BASE_URL=https://api.your-domain.com
# OR use ngrok for testing
NGROK_URL=https://your-ngrok-url.ngrok.io

# WhatsApp (Optional)
WHATSAPP_API_URL=your_api_url
WHATSAPP_API_KEY=your_api_key
WHATSAPP_GROUP_LINK=https://chat.whatsapp.com/your_group_link
```

### Frontend Production `.env.local`
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

## Database Setup

1. **Create production database:**
```sql
CREATE DATABASE gamer_portfolio_prod;
```

2. **Run migrations:**
```bash
cd backend
npx prisma migrate deploy
```

3. **Generate Prisma Client:**
```bash
npx prisma generate
```

## Nginx Configuration

Create `/etc/nginx/sites-available/gamer-portfolio`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Checklist

- [ ] Enable HTTPS/SSL
- [ ] Set secure environment variables
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable firewall rules
- [ ] Regular database backups
- [ ] Monitor logs and errors
- [ ] Keep dependencies updated
- [ ] Use strong database passwords
- [ ] Implement authentication for admin panel

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

### Health Check Endpoint
Add to your backend:
```typescript
@Get('health')
health() {
  return { status: 'ok', timestamp: new Date() };
}
```

## Backup Strategy

1. **Database backups:**
```bash
pg_dump -h localhost -U postgres gamer_portfolio > backup.sql
```

2. **Automated backups:**
Set up cron job for daily backups

## Troubleshooting

### Backend won't start
- Check environment variables
- Verify database connection
- Check port availability
- Review logs: `pm2 logs`

### Frontend build fails
- Clear `.next` folder
- Delete `node_modules` and reinstall
- Check environment variables

### Webhook not working
- Verify webhook URL is publicly accessible
- Check ngrok is running (for development)
- Verify MegaPay webhook configuration
- Check backend logs for errors

## Post-Deployment

1. Test all payment flows
2. Verify webhook is receiving notifications
3. Test admin panel functionality
4. Monitor error logs
5. Set up alerts for critical errors
