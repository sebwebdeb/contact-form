import Joi from 'joi';
import { createWindow } from 'jsdom';
import DOMPurify from 'dompurify';
import { ContactFormRequest, ValidationError } from './types';

/**
 * Initialize DOMPurify with JSDOM window
 */
const window = createWindow();
const purify = DOMPurify(window as unknown as Window);

/**
 * Joi schema for contact form validation
 */
const contactFormSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z\s\-'\.]+$/)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 1 character long',
      'string.max': 'Name must be less than 100 characters',
      'string.pattern.base': 'Name contains invalid characters',
    }),

  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: true } })
    .max(254)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'string.max': 'Email must be less than 254 characters',
    }),

  subject: Joi.string()
    .trim()
    .max(200)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Subject must be less than 200 characters',
    }),

  message: Joi.string()
    .trim()
    .min(10)
    .max(5000)
    .required()
    .messages({
      'string.empty': 'Message is required',
      'string.min': 'Message must be at least 10 characters long',
      'string.max': 'Message must be less than 5000 characters',
    }),
});

/**
 * Validates and sanitizes contact form input
 */
export function validateContactForm(data: unknown): {
  isValid: boolean;
  sanitizedData?: ContactFormRequest;
  errors?: ValidationError[];
} {
  const { error, value } = contactFormSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const validationErrors: ValidationError[] = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return {
      isValid: false,
      errors: validationErrors,
    };
  }

  // Sanitize the data
  const sanitizedData: ContactFormRequest = {
    name: purify.sanitize(value.name),
    email: purify.sanitize(value.email),
    subject: value.subject ? purify.sanitize(value.subject) : undefined,
    message: purify.sanitize(value.message),
  };

  return {
    isValid: true,
    sanitizedData,
  };
}

/**
 * Basic spam detection patterns
 */
const spamPatterns = [
  /\b(?:viagra|cialis|casino|poker|lottery|winner|congratulations)\b/i,
  /\b(?:click here|free money|make money fast|work from home)\b/i,
  /(?:https?:\/\/[^\s]+){3,}/i, // Multiple URLs
  /(.)\1{10,}/, // Repeated characters
  /[^\x00-\x7F]{20,}/, // Too many non-ASCII characters
];

/**
 * Checks if content appears to be spam
 */
export function isSpam(content: string): boolean {
  const cleanContent = content.toLowerCase();
  
  return spamPatterns.some(pattern => pattern.test(cleanContent));
}

/**
 * Rate limiting check (simple in-memory implementation)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number = 5;
  private readonly windowMs: number = 15 * 60 * 1000; // 15 minutes

  public isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const requestTimes = this.requests.get(identifier) || [];
    const validRequests = requestTimes.filter(time => time > windowStart);
    
    if (validRequests.length >= this.maxRequests) {
      return true;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return false;
  }

  public getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const requestTimes = this.requests.get(identifier) || [];
    const validRequests = requestTimes.filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Validates email format more strictly
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Sanitizes HTML content
 */
export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
    ALLOWED_ATTR: [],
  });
}