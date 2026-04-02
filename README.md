# Ruswaps Web Application

**MVA-EC Claims Calculator - India's First Web Application for Accident Claims Compensation & Disability Calculations**

## Features

### Calculators
- **MVA Claims Calculator** - Motor Vehicle Accident Claims for Death/Injury
- **Employee Compensation Calculator** - Workmen Compensation Act, 1923
- **Disability Calculator** - Locomotor, Amputation, PTD/PPD
- **Income Tax on Interest** - TDS calculation with PAN/No-PAN
- **Age Calculator** - Precise age calculation
- **Hit & Run Cases** - Special MV Act compensation

### Case Management
- Case Direction with hearing date tracking
- Status tracking (Pending, Next Hearing, Disposed)
- PDF export of case list
- Search and filter functionality

### Backend APIs
- JWT Authentication with refresh tokens
- User registration with OTP verification
- Razorpay payment integration
- OneSignal push notifications
- PostgreSQL database with Prisma ORM

## Tech Stack

- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma
- **Authentication**: JWT with bcrypt
- **Payments**: Razorpay
- **Notifications**: OneSignal
- **PDF Generation**: jsPDF

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone and install
cd ruswaps-web
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

### Environment Variables

Create `.env.local` with:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ruswaps"

# JWT
JWT_SECRET="your-super-secret-key-min-32-chars"
JWT_EXPIRES_IN="30d"
JWT_REFRESH_EXPIRES_IN="90d"

# Razorpay
RAZORPAY_KEY_ID="rzp_test_xxx"
RAZORPAY_KEY_SECRET="your_secret"

# OneSignal
ONESIGNAL_APP_ID="xxx"
ONESIGNAL_API_KEY="xxx"

# App URLs
NEXT_PUBLIC_APP_URL="https://ruswaps.in"
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| PUT | `/api/auth/register` | Send OTP |
| GET | `/api/auth/register` | Verify OTP |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| PUT | `/api/user/profile` | Update profile |
| POST | `/api/user/profile` | Change password |

### Cases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cases` | List user cases |
| POST | `/api/cases` | Create case |
| PUT | `/api/cases` | Update case |
| DELETE | `/api/cases` | Delete case |

### Calculations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calculations` | Calculate compensation |
| GET | `/api/calculations` | Get calculation history |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/razorpay` | Create order |
| PUT | `/api/payments/razorpay` | Verify payment |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/onesignal` | Send notification |
| PUT | `/api/notifications/onesignal` | Broadcast to all |

### App Info
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/app/version` | Get app version info |

## Database Schema

Run migrations:
```bash
npx prisma migrate dev --name init
```

Or push schema:
```bash
npx prisma db push
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

```bash
npm run build
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Manual Deployment

```bash
# Build
npm run build

# Start production server
npm start
```

## Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure database SSL
- [ ] Set up Razorpay webhook
- [ ] Configure OneSignal app
- [ ] Enable HTTPS
- [ ] Set up monitoring (Sentry)
- [ ] Configure rate limiting
- [ ] Set up CDN for static assets
- [ ] Enable Gzip compression
- [ ] Set up backup strategy

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT with short expiry + refresh tokens
- HTTP-only cookies for tokens
- Input validation on all endpoints
- SQL injection prevention via Prisma
- CORS configured for specific origins

## Support

- **Email**: support@ruswaps.in
- **Phone**: +91 9440117731
- **Website**: https://ruswaps.in

## Company

**Ruswaps India**
- MSME: UDYAM-AP-04-0002748
- Location: Tenali, Guntur Dist., Andhra Pradesh - 522201

## License

Proprietary - All rights reserved
