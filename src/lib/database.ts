// Database configuration for Ruswaps
// This can be used with any SQL database (PostgreSQL, MySQL, SQLite)

export const dbConfig = {
  // For production, use environment variables
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ruswaps',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  
  // Connection pool settings
  pool: {
    min: 2,
    max: 10,
  },
  
  // SSL settings for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
};

// Table schemas
export const schemas = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(10) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE,
      name VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      player_id VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      is_subscribed BOOLEAN DEFAULT false,
      subscription_expiry DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  
  subscriptions: `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      plan VARCHAR(20) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      payment_id VARCHAR(100),
      order_id VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  
  cases: `
    CREATE TABLE IF NOT EXISTS cases (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      case_no VARCHAR(50) NOT NULL,
      case_year INTEGER NOT NULL,
      case_type VARCHAR(255) NOT NULL,
      court_name VARCHAR(255),
      hearing_date DATE,
      posted_for VARCHAR(255),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  
  calculations: `
    CREATE TABLE IF NOT EXISTS calculations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type VARCHAR(50) NOT NULL,
      input_data JSONB NOT NULL,
      result_data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  
  notifications: `
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(20) DEFAULT 'info',
      is_read BOOLEAN DEFAULT false,
      data JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  
  mailers: `
    CREATE TABLE IF NOT EXISTS mailers (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  
  page_registrations: `
    CREATE TABLE IF NOT EXISTS page_registrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  
  page_views: `
    CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      page_name VARCHAR(50) UNIQUE NOT NULL,
      page_count INTEGER DEFAULT 0
    );
  `,
  
  app_version: `
    CREATE TABLE IF NOT EXISTS app_version (
      id SERIAL PRIMARY KEY,
      version VARCHAR(20) NOT NULL,
      min_version VARCHAR(20),
      force_update BOOLEAN DEFAULT false,
      playstore_url TEXT,
      payment_key VARCHAR(255),
      payment_price DECIMAL(10, 2),
      payment_img TEXT,
      payment_allow_days INTEGER,
      death_count INTEGER DEFAULT 200000,
      injuries_count INTEGER DEFAULT 50000,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  
  banners: `
    CREATE TABLE IF NOT EXISTS banners (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      image TEXT,
      link TEXT,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0
    );
  `,
  
  latest_news: `
    CREATE TABLE IF NOT EXISTS latest_news (
      id SERIAL PRIMARY KEY,
      news TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  
  legal_dictionary: `
    CREATE TABLE IF NOT EXISTS legal_dictionary (
      id SERIAL PRIMARY KEY,
      term VARCHAR(255) NOT NULL,
      definition TEXT NOT NULL,
      category VARCHAR(100)
    );
  `,
  
  ws_documents: `
    CREATE TABLE IF NOT EXISTS ws_documents (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      file_url TEXT NOT NULL,
      category VARCHAR(100)
    );
  `
};

// Age factors for calculations
export const ageFactors = [
  { minAge: 0, maxAge: 16, factor: 0.50 },
  { minAge: 17, maxAge: 22, factor: 0.65 },
  { minAge: 23, maxAge: 25, factor: 0.70 },
  { minAge: 26, maxAge: 30, factor: 0.80 },
  { minAge: 31, maxAge: 35, factor: 0.90 },
  { minAge: 36, maxAge: 40, factor: 0.95 },
  { minAge: 41, maxAge: 45, factor: 1.00 },
  { minAge: 46, maxAge: 50, factor: 1.10 },
  { minAge: 51, maxAge: 55, factor: 1.25 },
  { minAge: 56, maxAge: 60, factor: 1.40 },
  { minAge: 61, maxAge: 150, factor: 1.50 },
];

export function getAgeFactor(age: number): number {
  const factor = ageFactors.find(f => age >= f.minAge && age <= f.maxAge);
  return factor?.factor || 1.0;
}
