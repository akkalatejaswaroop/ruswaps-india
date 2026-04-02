# Ruswaps Web - Deployment Guide

## Prerequisites
- Node.js 18+
- PostgreSQL database
- Netlify account

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Set up database
cp .env.example .env.local
# Edit .env.local with your database URL and secrets

# Run migrations
npm run db:push

# Start development server
npm run dev
```

## Netlify Deployment (Drag & Drop)

### Method 1: Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Build the project
npm run build

# Deploy
netlify deploy --prod --dir=.next
```

### Method 2: Netlify UI (Drag & Drop)

1. Build the project locally:
```bash
npm run build
```

2. This creates a `.next` folder

3. Go to https://app.netlify.com/drop

4. Drag the `.next` folder to the drop zone

### Method 3: Git Integration

1. Push your code to GitHub/GitLab

2. Connect repository in Netlify

3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`

## Environment Variables

Set these in Netlify Dashboard > Site Settings > Environment Variables:

### Required for Production:
```
DATABASE_URL=postgresql://user:pass@host:5432/ruswaps
JWT_SECRET=your-production-jwt-secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_API_KEY=your_onesignal_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=Ruswaps <your_email@gmail.com>
NODE_ENV=production
```

### Client-Side (NEXT_PUBLIC_):
```
NEXT_PUBLIC_APP_URL=https://your-domain.netlify.app
NEXT_PUBLIC_API_URL=https://your-domain.netlify.app
NEXT_PUBLIC_ADMIN_KEY=your-admin-key
```

## API Routes

The API routes run as serverless functions on Netlify. Make sure:
1. All environment variables are set
2. Database is accessible from Netlify's servers
3. CORS headers are configured properly

## Database Setup

### Option 1: Supabase (Recommended)
1. Create account at https://supabase.com
2. Create new project
3. Get connection string from Settings > Database
4. Set as DATABASE_URL

### Option 2: Railway
1. Create account at https://railway.app
2. Create PostgreSQL database
3. Get connection string

### Option 3: Neon
1. Create account at https://neon.tech
2. Create project
3. Get connection string

## Troubleshooting

### Build fails
- Check Node.js version (18+)
- Run `npm install` fresh
- Verify all environment variables are set

### API routes not working
- Check DATABASE_URL is correct
- Verify database is accessible
- Check serverless function logs in Netlify

### Database connection errors
- Whitelist Netlify IPs in database firewall
- Use connection pooling for serverless
- Consider using Supabase/Neon with direct connection strings
