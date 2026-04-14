import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: Date;
  retryAfterMs?: number;
}

const defaultConfig: Record<string, RateLimitConfig> = {
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  calculation: { windowMs: 60 * 1000, maxRequests: 20 },
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  payment: { windowMs: 60 * 1000, maxRequests: 10 },
};

class DatabaseRateLimiter {
  async check(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);
    const expiresAt = new Date(now.getTime() + windowMs);

    try {
      const existing = await prisma.rateLimit.findUnique({
        where: { key: identifier },
      });

      if (!existing || existing.windowStart < windowStart) {
        await prisma.rateLimit.upsert({
          where: { key: identifier },
          update: { count: 1, windowStart: now, expiresAt },
          create: { key: identifier, count: 1, windowStart: now, expiresAt },
        });

        return {
          success: true,
          remaining: limit - 1,
          resetTime: expiresAt,
        };
      }

      if (existing.count >= limit) {
        return {
          success: false,
          remaining: 0,
          resetTime: existing.expiresAt,
          retryAfterMs: existing.expiresAt.getTime() - now.getTime(),
        };
      }

      await prisma.rateLimit.update({
        where: { key: identifier },
        data: { count: existing.count + 1 },
      });

      return {
        success: true,
        remaining: limit - existing.count - 1,
        resetTime: existing.expiresAt,
      };
    } catch (error) {
      logger.error('Database rate limit error', error);
      return {
        success: true,
        remaining: limit,
        resetTime: new Date(now.getTime() + windowMs),
      };
    }
  }
}

class RedisRateLimiter {
  private restUrl: string;
  private authToken: string;
  private fallback: DatabaseRateLimiter;

  constructor() {
    this.restUrl = process.env.UPSTASH_REDIS_REST_URL || '';
    this.authToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';
    this.fallback = new DatabaseRateLimiter();
  }

  private async redisRequest(command: string[]): Promise<unknown> {
    try {
      const response = await fetch(`${this.restUrl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        throw new Error(`Redis request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Redis rate limit error, falling back to database', error);
      return null;
    }
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const redisResult = await this.executeRedisCheck(key, limit, windowMs);
    if (redisResult !== null) {
      return redisResult;
    }
    return this.fallback.check(key, limit, windowMs);
  }

  private async executeRedisCheck(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `ratelimit:${key}`;

    const result = await this.redisRequest([
      'ZREMRANGEBYSCORE',
      redisKey,
      '0',
      windowStart.toString(),
    ]);

    const countResult = await this.redisRequest(['ZCARD', redisKey]);

    const currentCount = Array.isArray(countResult) ? (countResult[0] as number) || 0 : 0;

    if (currentCount >= limit) {
      const resetResult = await this.redisRequest(['ZRANGE', redisKey, '0', '0', 'WITHSCORES']);
      const oldestTimestamp = Array.isArray(resetResult) && resetResult.length >= 2
        ? parseInt(resetResult[1] as string, 10)
        : now;
      const resetTime = new Date(oldestTimestamp + windowMs);
      const retryAfterMs = resetTime.getTime() - now;

      return {
        success: false,
        remaining: 0,
        resetTime,
        retryAfterMs,
      };
    }

    const addResult = await this.redisRequest(['ZADD', redisKey, now.toString(), `${now}`]);
    
    if (!addResult || (Array.isArray(addResult) && addResult[0] !== 1)) {
      logger.warn('Redis ZADD returned unexpected result, falling back to database');
      return null;
    }
    
    await this.redisRequest(['EXPIRE', redisKey, Math.ceil(windowMs / 1000).toString()]);

    return {
      success: true,
      remaining: limit - currentCount - 1,
      resetTime: new Date(now + windowMs),
    };
  }
}

class InMemoryRateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const stored = this.store.get(key);

    if (stored && stored.resetTime > now) {
      if (stored.count >= limit) {
        return {
          success: false,
          remaining: 0,
          resetTime: new Date(stored.resetTime),
          retryAfterMs: stored.resetTime - now,
        };
      }

      stored.count++;
      return {
        success: true,
        remaining: limit - stored.count,
        resetTime: new Date(stored.resetTime),
      };
    }

    this.store.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });

    this.cleanup();

    return {
      success: true,
      remaining: limit - 1,
      resetTime: new Date(now + windowMs),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }
}

type RateLimiterType = 'redis' | 'memory' | 'database';

function getRateLimiterType(): RateLimiterType {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return 'redis';
  }

  if (process.env.REDIS_URL) {
    return 'redis';
  }

  if (process.env.NODE_ENV === 'production') {
    return 'database';
  }

  return 'memory';
}

interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> | RateLimitResult;
}

let rateLimiter: RateLimiter;
let limiterType: RateLimiterType;

function initializeRateLimiter(): void {
  limiterType = getRateLimiterType();

  switch (limiterType) {
    case 'redis':
      rateLimiter = new RedisRateLimiter();
      logger.info('Rate limiter initialized: Redis (Upstash)');
      break;
    case 'memory':
      rateLimiter = new InMemoryRateLimiter();
      logger.warn('Rate limiter initialized: In-Memory (not recommended for production)');
      break;
    case 'database':
      rateLimiter = new DatabaseRateLimiter();
      logger.info('Rate limiter initialized: Database (PostgreSQL)');
      break;
  }
}

initializeRateLimiter();

export async function checkRateLimit(
  identifier: string,
  type: keyof typeof defaultConfig = 'api'
): Promise<RateLimitResult> {
  const config = defaultConfig[type];

  try {
    return await rateLimiter.check(
      identifier,
      config.maxRequests,
      config.windowMs
    );
  } catch (error) {
    logger.error('Rate limit check failed', error);
    return {
      success: true,
      remaining: config.maxRequests,
      resetTime: new Date(Date.now() + config.windowMs),
    };
  }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toISOString(),
    ...(result.retryAfterMs && {
      'Retry-After': Math.ceil(result.retryAfterMs / 1000).toString(),
    }),
  };
}

export function getRateLimiterTypeInfo(): { type: RateLimiterType; production: boolean } {
  return {
    type: limiterType,
    production: limiterType !== 'memory',
  };
}
