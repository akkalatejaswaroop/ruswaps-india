import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer | null {
  const secret = process.env.OTP_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    console.warn('OTP_ENCRYPTION_SECRET not set or too short, OTPs will not be encrypted');
    return null;
  }
  return scryptSync(secret, 'ruswaps-otp-salt', KEY_LENGTH);
}

export function encryptOTP(otp: string): string {
  const key = getEncryptionKey();
  if (!key) {
    return otp;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(otp, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decryptOTP(encryptedOtp: string): string | null {
  const key = getEncryptionKey();
  if (!key) {
    return encryptedOtp;
  }

  const parts = encryptedOtp.split(':');
  if (parts.length !== 3) {
    return null;
  }

  const [ivHex, tagHex, encrypted] = parts;
  
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
      return null;
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch {
    return null;
  }
}

export function isEncryptedOTP(value: string): boolean {
  return value.includes(':') && value.split(':').length === 3;
}
