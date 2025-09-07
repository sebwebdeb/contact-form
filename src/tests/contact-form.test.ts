import { Context, HttpRequest } from '@azure/functions';
import contactFormFunction from '../functions/contact-form/index';
import { validateContactForm } from '../shared/validation';
import * as emailService from '../shared/email-service';

// Mock the email service
jest.mock('../shared/email-service', () => ({
  sendContactEmail: jest.fn(),
}));

// Mock Azure Key Vault and Identity
jest.mock('@azure/keyvault-secrets', () => ({
  SecretClient: jest.fn(),
}));

jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn(),
}));

describe('Contact Form Function', () => {
  let mockContext: Context;
  let mockRequest: HttpRequest;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock context
    mockContext = {
      invocationId: 'test-invocation-id',
      res: {},
      log: jest.fn(),
    } as unknown as Context;

    // Mock request
    mockRequest = {
      method: 'POST',
      headers: {
        origin: 'https://yourdomain.com',
        'content-type': 'application/json',
      },
      body: {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'This is a test message.',
      },
    } as HttpRequest;
  });

  describe('POST requests', () => {
    it('should successfully process valid contact form submission', async () => {
      const mockSendEmail = emailService.sendContactEmail as jest.MockedFunction<typeof emailService.sendContactEmail>;
      mockSendEmail.mockResolvedValue();

      await contactFormFunction(mockContext, mockRequest);

      expect(mockContext.res).toEqual({
        status: 200,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://yourdomain.com',
        }),
        body: expect.objectContaining({
          success: true,
          message: 'Thank you for your message. We will get back to you soon.',
          id: expect.any(String),
        }),
      });

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'Test Subject',
          message: 'This is a test message.',
        }),
        expect.any(String)
      );
    });

    it('should return validation error for invalid input', async () => {
      mockRequest.body = {
        name: '',
        email: 'invalid-email',
        message: 'Too short',
      };

      await contactFormFunction(mockContext, mockRequest);

      expect(mockContext.res).toEqual({
        status: 400,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: expect.any(Array),
        }),
      });
    });

    it('should handle email service errors gracefully', async () => {
      const mockSendEmail = emailService.sendContactEmail as jest.MockedFunction<typeof emailService.sendContactEmail>;
      mockSendEmail.mockRejectedValue(new Error('Email service error'));

      await contactFormFunction(mockContext, mockRequest);

      expect(mockContext.res).toEqual({
        status: 500,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        }),
      });
    });

    it('should detect and handle spam content', async () => {
      mockRequest.body = {
        ...mockRequest.body,
        message: 'Click here for free money and casino winnings!',
      };

      await contactFormFunction(mockContext, mockRequest);

      expect(mockContext.res?.status).toBe(200);
      expect(emailService.sendContactEmail).not.toHaveBeenCalled();
    });

    it('should reject requests from unauthorized origins', async () => {
      mockRequest.headers.origin = 'https://malicious-site.com';

      await contactFormFunction(mockContext, mockRequest);

      expect(mockContext.res?.headers).not.toHaveProperty('Access-Control-Allow-Origin');
    });
  });

  describe('OPTIONS requests (CORS preflight)', () => {
    it('should handle OPTIONS requests for allowed origins', async () => {
      mockRequest.method = 'OPTIONS';
      
      await contactFormFunction(mockContext, mockRequest);

      expect(mockContext.res).toEqual({
        status: 200,
        headers: expect.objectContaining({
          'Access-Control-Allow-Origin': 'https://yourdomain.com',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        }),
        body: null,
      });
    });
  });

  describe('Invalid HTTP methods', () => {
    it('should reject GET requests', async () => {
      mockRequest.method = 'GET';

      await contactFormFunction(mockContext, mockRequest);

      expect(mockContext.res).toEqual({
        status: 405,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.objectContaining({
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only POST requests are allowed',
        }),
      });
    });
  });
});

describe('Validation Functions', () => {
  describe('validateContactForm', () => {
    it('should validate and sanitize correct input', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'This is a valid message with sufficient length.',
      };

      const result = validateContactForm(input);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData).toEqual(input);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid input', () => {
      const input = {
        name: '',
        email: 'invalid-email',
        message: 'Short',
      };

      const result = validateContactForm(input);

      expect(result.isValid).toBe(false);
      expect(result.sanitizedData).toBeUndefined();
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'message' }),
        ])
      );
    });

    it('should sanitize HTML in input', () => {
      const input = {
        name: 'John <script>alert("xss")</script> Doe',
        email: 'john@example.com',
        message: 'Message with <img src="x" onerror="alert(1)"> harmful content.',
      };

      const result = validateContactForm(input);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.name).not.toContain('<script>');
      expect(result.sanitizedData?.message).not.toContain('<img');
    });

    it('should handle optional subject field', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This is a valid message without subject.',
      };

      const result = validateContactForm(input);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.subject).toBeUndefined();
    });
  });
});