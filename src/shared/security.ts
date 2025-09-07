import { SecurityHeaders } from './types';

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS: SecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

/**
 * CORS configuration for multiple origins
 */
const ALLOWED_ORIGINS = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'https://staging.yourdomain.com',
  // Add more allowed origins as needed
];

/**
 * Validates if origin is allowed
 */
export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  
  // Allow all origins in development (check environment)
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Gets CORS headers for response
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && isOriginAllowed(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'false';
  }

  return corsHeaders;
}

/**
 * Generates a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Masks sensitive data for logging
 */
export function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...data };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'email'];
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***MASKED***';
    }
  }
  
  return masked;
}

/**
 * Basic IP address extraction from headers
 */
export function getClientIp(headers: Record<string, string | undefined>): string {
  return (
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['x-real-ip'] ||
    headers['x-client-ip'] ||
    'unknown'
  );
}