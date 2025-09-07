import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { validateContactForm, isSpam, rateLimiter } from '../../shared/validation';
import { sendContactEmail } from '../../shared/email-service';
import { logger } from '../../shared/logger';
import { 
  SECURITY_HEADERS, 
  getCorsHeaders, 
  generateRequestId, 
  getClientIp, 
  maskSensitiveData 
} from '../../shared/security';
import { 
  ContactFormRequest, 
  ContactFormResponse, 
  ApiError 
} from '../../shared/types';

/**
 * Contact Form Azure Function
 * Handles POST requests to /api/contactForm
 */
const contactFormFunction: AzureFunction = async (
  context: Context,
  req: HttpRequest
): Promise<void> => {
  const requestId = generateRequestId();
  const clientIp = getClientIp(req.headers);
  const origin = req.headers.origin;
  
  // Set up logging context
  logger.setContext({
    operationId: context.invocationId,
    operationName: 'ContactForm',
    requestId,
  });

  logger.info('Contact form request received', {
    requestId,
    method: req.method,
    origin,
    clientIp: maskSensitiveData({ clientIp }).clientIp,
  });

  try {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      context.res = {
        status: 200,
        headers: {
          ...SECURITY_HEADERS,
          ...getCorsHeaders(origin),
        },
        body: null,
      };
      return;
    }

    // Validate request method
    if (req.method !== 'POST') {
      const error: ApiError = {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST requests are allowed',
        timestamp: new Date().toISOString(),
      };

      context.res = {
        status: 405,
        headers: {
          ...SECURITY_HEADERS,
          ...getCorsHeaders(origin),
          'Content-Type': 'application/json',
        },
        body: error,
      };
      return;
    }

    // Rate limiting check
    if (rateLimiter.isRateLimited(clientIp)) {
      logger.warn('Rate limit exceeded', { clientIp, requestId });
      
      const error: ApiError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        timestamp: new Date().toISOString(),
      };

      context.res = {
        status: 429,
        headers: {
          ...SECURITY_HEADERS,
          ...getCorsHeaders(origin),
          'Content-Type': 'application/json',
          'Retry-After': '900', // 15 minutes
        },
        body: error,
      };
      return;
    }

    // Validate and sanitize input
    const validationResult = validateContactForm(req.body);
    
    if (!validationResult.isValid || !validationResult.sanitizedData) {
      logger.warn('Validation failed', { 
        errors: validationResult.errors, 
        requestId 
      });

      const error: ApiError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: validationResult.errors,
        timestamp: new Date().toISOString(),
      };

      context.res = {
        status: 400,
        headers: {
          ...SECURITY_HEADERS,
          ...getCorsHeaders(origin),
          'Content-Type': 'application/json',
        },
        body: error,
      };
      return;
    }

    const formData = validationResult.sanitizedData;

    // Spam detection
    const messageContent = `${formData.name} ${formData.subject || ''} ${formData.message}`;
    if (isSpam(messageContent)) {
      logger.warn('Spam detected', { 
        requestId,
        clientIp: maskSensitiveData({ clientIp }).clientIp,
      });

      // Return success to avoid revealing spam detection
      const response: ContactFormResponse = {
        success: true,
        message: 'Thank you for your message. We will get back to you soon.',
        id: requestId,
      };

      context.res = {
        status: 200,
        headers: {
          ...SECURITY_HEADERS,
          ...getCorsHeaders(origin),
          'Content-Type': 'application/json',
        },
        body: response,
      };
      return;
    }

    // Send email
    await sendContactEmail(formData, requestId);

    logger.info('Contact form processed successfully', { 
      requestId,
      remainingRequests: rateLimiter.getRemainingRequests(clientIp),
    });

    const response: ContactFormResponse = {
      success: true,
      message: 'Thank you for your message. We will get back to you soon.',
      id: requestId,
    };

    context.res = {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json',
      },
      body: response,
    };

  } catch (error) {
    logger.error('Unexpected error in contact form function', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
      stack: error instanceof Error ? error.stack : undefined,
    });

    const apiError: ApiError = {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      timestamp: new Date().toISOString(),
    };

    context.res = {
      status: 500,
      headers: {
        ...SECURITY_HEADERS,
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json',
      },
      body: apiError,
    };
  }
};

export default contactFormFunction;