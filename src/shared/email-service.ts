import nodemailer from 'nodemailer';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { 
  ContactFormRequest, 
  EmailConfig, 
  EmailTemplate, 
  KeyVaultSecrets 
} from './types';
import { logger } from './logger';

/**
 * Email service for sending contact form messages via ProtonMail SMTP
 */
class EmailService {
  private config: EmailConfig | null = null;
  private transporter: nodemailer.Transporter | null = null;
  private secretClient: SecretClient | null = null;

  constructor() {
    this.initializeKeyVaultClient();
  }

  /**
   * Initialize Azure Key Vault client
   */
  private initializeKeyVaultClient(): void {
    try {
      const keyVaultUrl = process.env.AZURE_KEYVAULT_URL;
      if (!keyVaultUrl) {
        logger.warn('AZURE_KEYVAULT_URL not configured, using environment variables for email config');
        return;
      }

      const credential = new DefaultAzureCredential();
      this.secretClient = new SecretClient(keyVaultUrl, credential);
      logger.info('Key Vault client initialized');
    } catch (error) {
      logger.error('Failed to initialize Key Vault client', { error });
    }
  }

  /**
   * Load email configuration from Key Vault or environment variables
   */
  private async loadEmailConfig(): Promise<EmailConfig> {
    if (this.config) {
      return this.config;
    }

    let secrets: KeyVaultSecrets;

    try {
      if (this.secretClient) {
        // Load from Key Vault
        const [userSecret, passwordSecret, recipientSecret] = await Promise.all([
          this.secretClient.getSecret('email-smtp-user'),
          this.secretClient.getSecret('email-smtp-password'),
          this.secretClient.getSecret('recipient-email-address'),
        ]);

        secrets = {
          emailSmtpUser: userSecret.value || '',
          emailSmtpPassword: passwordSecret.value || '',
          recipientEmailAddress: recipientSecret.value || '',
        };

        logger.info('Email configuration loaded from Key Vault');
      } else {
        // Fallback to environment variables
        secrets = {
          emailSmtpUser: process.env.EMAIL_SMTP_USER || '',
          emailSmtpPassword: process.env.EMAIL_SMTP_PASSWORD || '',
          recipientEmailAddress: process.env.RECIPIENT_EMAIL_ADDRESS || '',
        };

        logger.info('Email configuration loaded from environment variables');
      }
    } catch (error) {
      logger.error('Failed to load email configuration', { error });
      throw new Error('Email configuration unavailable');
    }

    if (!secrets.emailSmtpUser || !secrets.emailSmtpPassword || !secrets.recipientEmailAddress) {
      throw new Error('Missing required email configuration');
    }

    this.config = {
      smtp: {
        host: 'mail.proton.me',
        port: 587,
        secure: false, // Use STARTTLS
        user: secrets.emailSmtpUser,
        password: secrets.emailSmtpPassword,
      },
      from: {
        name: 'Contact Form',
        email: secrets.emailSmtpUser,
      },
      to: {
        email: secrets.recipientEmailAddress,
      },
    };

    return this.config;
  }

  /**
   * Initialize email transporter
   */
  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const config = await this.loadEmailConfig();

    this.transporter = nodemailer.createTransporter({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
      tls: {
        // ProtonMail SMTP configuration
        ciphers: 'SSLv3',
        rejectUnauthorized: true,
      },
      pool: true,
      maxConnections: 1,
      maxMessages: 10,
    });

    // Verify connection
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
    } catch (error) {
      logger.error('SMTP connection verification failed', { error });
      throw new Error('Failed to verify SMTP connection');
    }

    return this.transporter;
  }

  /**
   * Generate email template
   */
  private generateEmailTemplate(formData: ContactFormRequest, requestId: string): EmailTemplate {
    const subject = formData.subject 
      ? `Contact Form: ${formData.subject}` 
      : 'New Contact Form Submission';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contact Form Submission</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            background-color: #007bff;
            color: white;
            padding: 20px;
            margin: -30px -30px 30px -30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .field {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e9ecef;
          }
          .field:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: bold;
            color: #495057;
            display: block;
            margin-bottom: 5px;
          }
          .value {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            border-left: 3px solid #007bff;
          }
          .message {
            white-space: pre-line;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
            font-size: 0.9em;
            color: #6c757d;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Contact Form Submission</h1>
          </div>
          
          <div class="field">
            <span class="label">Name:</span>
            <div class="value">${formData.name}</div>
          </div>
          
          <div class="field">
            <span class="label">Email:</span>
            <div class="value">${formData.email}</div>
          </div>
          
          ${formData.subject ? `
          <div class="field">
            <span class="label">Subject:</span>
            <div class="value">${formData.subject}</div>
          </div>
          ` : ''}
          
          <div class="field">
            <span class="label">Message:</span>
            <div class="value message">${formData.message}</div>
          </div>
          
          <div class="footer">
            <p><strong>Request ID:</strong> ${requestId}</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><em>This message was sent via your website's contact form.</em></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Contact Form Submission

Name: ${formData.name}
Email: ${formData.email}
${formData.subject ? `Subject: ${formData.subject}` : ''}

Message:
${formData.message}

---
Request ID: ${requestId}
Timestamp: ${new Date().toISOString()}

This message was sent via your website's contact form.
    `;

    return {
      subject,
      html,
      text: text.trim(),
    };
  }

  /**
   * Send contact form email
   */
  public async sendContactEmail(formData: ContactFormRequest, requestId: string): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const config = await this.loadEmailConfig();
      const template = this.generateEmailTemplate(formData, requestId);

      const mailOptions = {
        from: `"${config.from.name}" <${config.from.email}>`,
        to: config.to.email,
        replyTo: formData.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        headers: {
          'X-Request-ID': requestId,
          'X-Contact-Form': 'true',
        },
      };

      const result = await transporter.sendMail(mailOptions);
      
      logger.info('Contact email sent successfully', {
        requestId,
        messageId: result.messageId,
        response: result.response,
      });

    } catch (error) {
      logger.error('Failed to send contact email', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      throw new Error('Failed to send email');
    }
  }

  /**
   * Test email configuration
   */
  public async testConfiguration(): Promise<boolean> {
    try {
      await this.getTransporter();
      return true;
    } catch (error) {
      logger.error('Email configuration test failed', { error });
      return false;
    }
  }
}

// Export singleton instance
const emailService = new EmailService();

/**
 * Send contact form email
 */
export async function sendContactEmail(formData: ContactFormRequest, requestId: string): Promise<void> {
  await emailService.sendContactEmail(formData, requestId);
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<boolean> {
  return await emailService.testConfiguration();
}