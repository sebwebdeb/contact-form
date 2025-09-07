/**
 * Core types for the Contact Form API
 */

export interface ContactFormRequest {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface ContactFormResponse {
  success: boolean;
  message: string;
  id?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
  from: {
    name: string;
    email: string;
  };
  to: {
    name?: string;
    email: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

export interface SecurityHeaders {
  [key: string]: string;
}

export interface AppInsightsContext {
  operationId: string;
  operationName: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
}

export interface KeyVaultSecrets {
  emailSmtpUser: string;
  emailSmtpPassword: string;
  recipientEmailAddress: string;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  operationId?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  checks: {
    [service: string]: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
  };
  timestamp: string;
}