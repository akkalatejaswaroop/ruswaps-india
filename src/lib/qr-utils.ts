/**
 * Utility for generating QR codes for verified calculations.
 * Uses the QRServer public API for simplicity and no dependencies.
 */

export function getVerificationUrl(calculationId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ruswaps.com';
  return `${baseUrl}/verify/${calculationId}`;
}

export function getQrCodeUrl(calculationId: string, size: number = 200): string {
  const data = encodeURIComponent(getVerificationUrl(calculationId));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}`;
}

/**
 * Generates a unique verification ID for a calculation.
 * Can be used when a calculation is "finalized" for premium users.
 */
export function generateVerificationId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
