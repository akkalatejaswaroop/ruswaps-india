export interface EnvVarConfig {
  name: string;
  required: boolean;
  defaultValue?: string;
  validate?: (value: string) => boolean;
  description?: string;
}

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const envConfig: EnvVarConfig[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection string',
    validate: (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
  },
  {
    name: 'JWT_SECRET',
    required: true,
    validate: (v) => v.length >= 32,
    description: 'JWT signing secret (minimum 32 characters)',
  },
  {
    name: 'RAZORPAY_KEY_ID',
    required: false,
    description: 'Razorpay API key ID',
  },
  {
    name: 'RAZORPAY_KEY_SECRET',
    required: false,
    description: 'Razorpay API key secret',
  },
  {
    name: 'SENTRY_DSN',
    required: false,
    description: 'Sentry error tracking DSN',
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    defaultValue: 'http://localhost:3000',
    description: 'Public application URL',
  },
  {
    name: 'REDIS_URL',
    required: false,
    description: 'Redis URL for rate limiting (Upstash)',
  },
  {
    name: 'UPSTASH_REDIS_REST_URL',
    required: false,
    description: 'Upstash Redis REST URL',
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    required: false,
    description: 'Upstash Redis REST API token',
  },
  {
    name: 'ECOURTS_API_KEY',
    required: false,
    description: 'eCourts API authentication key',
  },
  {
    name: 'ECOURTS_API_BASE_URL',
    required: false,
    defaultValue: 'https://apis.ecourts.gov.in/public',
    description: 'eCourts API base URL',
  },
  {
    name: 'ECOURTS_SYNC_STATES',
    required: false,
    description: 'Comma-separated state codes to sync (e.g. "AP,TS,KA")',
  },
  {
    name: 'CRON_SECRET',
    required: true,
    description: 'Secret for cron job authentication',
  },
];

function validateEnvValue(config: EnvVarConfig, value: string | undefined): { valid: boolean; error?: string } {
  const isEmpty = !value || value.trim() === '';

  if (config.required && isEmpty) {
    return {
      valid: false,
      error: `${config.name} is required but not set`,
    };
  }

  if (isEmpty && config.defaultValue) {
    return { valid: true };
  }

  if (!isEmpty && config.validate && !config.validate(value!)) {
    return {
      valid: false,
      error: `${config.name} has invalid format`,
    };
  }

  return { valid: true };
}

export function validateEnvironment(): EnvValidationResult {
  const result: EnvValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const missingRequired: string[] = [];
  const invalidVars: string[] = [];

  for (const config of envConfig) {
    const value = process.env[config.name];
    const validation = validateEnvValue(config, value);

    if (!validation.valid) {
      if (config.required) {
        missingRequired.push(`${config.name}: ${validation.error}`);
      } else {
        invalidVars.push(`${config.name}: ${validation.error}`);
      }
    }

    if (!config.required && !value && config.defaultValue) {
      result.warnings.push(`${config.name} not set, using default value`);
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      result.warnings.push('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set - payment processing will be simulated');
    }

    if (!process.env.SENTRY_DSN) {
      result.warnings.push('SENTRY_DSN not set - error tracking disabled in production');
    }

    if (!process.env.REDIS_URL && !process.env.UPSTASH_REDIS_REST_URL) {
      result.warnings.push('Redis/Upstash not configured - using database-based rate limiting');
    }

    if (!process.env.ECOURTS_API_KEY) {
      result.errors.push('ECOURTS_API_KEY is required in production - get this from the eCourts API portal');
    }

    if (!process.env.ECOURTS_SYNC_STATES) {
      result.warnings.push('ECOURTS_SYNC_STATES not set - no states configured for sync');
    }

    if (!process.env.CRON_SECRET) {
      result.errors.push('CRON_SECRET is required in production to secure the cron endpoint');
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('change-this-in-production')) {
      result.errors.push('JWT_SECRET contains default value - must be changed for production');
    }
  }

  if (missingRequired.length > 0) {
    result.valid = false;
    result.errors.push(...missingRequired);
  }

  if (invalidVars.length > 0) {
    result.valid = false;
    result.errors.push(...invalidVars);
  }

  return result;
}

export function assertEnvironment(): void {
  const result = validateEnvironment();

  if (!result.valid) {
    const errorMessage = [
      'Missing required environment variables:',
      ...result.errors.map((e) => `  - ${e}`),
    ].join('\n');

    throw new Error(`ENVIRONMENT VALIDATION FAILED:\n${errorMessage}`);
  }

  if (result.warnings.length > 0) {
    console.warn('[ENV WARNING] Environment warnings:');
    result.warnings.forEach((w) => console.warn(`  - ${w}`));
  }
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export function getOptionalEnv(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}
