# Contact Form API

A production-ready, serverless contact form API built with Azure Functions, TypeScript, and Nodemailer. This solution provides a secure, scalable way to handle contact form submissions from static websites using ProtonMail SMTP.

## 🏗️ Architecture

- **Azure Function App** (Node.js 18, TypeScript)
- **Nodemailer** with ProtonMail SMTP (`mail.proton.me:587`, STARTTLS)
- **Azure Key Vault** for secure credential storage
- **Application Insights** for monitoring and logging
- **Bicep** for Infrastructure as Code
- **GitHub Actions** for CI/CD pipeline

## 📁 Project Structure

```
contact-form-api/
├── .github/workflows/                  # CI/CD Pipelines
│   ├── application.yml                 # Application deployment workflow
│   └── infrastructure.yml              # Infrastructure deployment workflow
├── infrastructure/                     # Infrastructure as Code
│   ├── main.bicep                      # Main Bicep template
│   └── modules/                        # Bicep modules
│       ├── app-insights.bicep          # Application Insights
│       ├── function-app.bicep          # Function App resources
│       ├── key-vault.bicep             # Key Vault for secrets
│       ├── log-analytics.bicep         # Log Analytics workspace
│       └── storage.bicep               # Storage account
├── src/                                # Source code
│   ├── functions/
│   │   └── contact-form/
│   │       ├── function.json           # Function configuration
│   │       └── index.ts                # Function entry point
│   ├── shared/                         # Shared utilities
│   │   ├── email-service.ts            # Email sending with ProtonMail
│   │   ├── logger.ts                   # Structured logging
│   │   ├── security.ts                 # Security utilities & CORS
│   │   ├── types.ts                    # TypeScript type definitions
│   │   └── validation.ts               # Input validation & spam detection
│   └── tests/                          # Unit tests
│       ├── contact-form.test.ts        # Function tests
│       └── setup.ts                    # Jest test setup
├── .eslintrc.js                        # ESLint configuration
├── .gitignore                          # Git ignore rules
├── .prettierrc                         # Prettier configuration
├── host.json                           # Azure Functions host settings
├── jest.config.js                      # Jest test configuration
├── local.settings.json                 # Local development settings
├── package.json                        # NPM dependencies & scripts
├── tsconfig.json                       # TypeScript configuration
└── README.md                           # This file
```

## 🚀 Features

### ✅ Core Functionality
- **HTTP POST endpoint** `/api/contactform` accepting: name, email, subject (optional), message
- **Input validation** with Joi schema validation and HTML sanitization
- **Spam detection** with configurable patterns and content analysis
- **Professional email templates** with HTML and plain text versions
- **ProtonMail SMTP integration** with secure app password authentication

### 🔒 Security
- **CORS support** with configurable origins
- **Rate limiting** (5 requests per 15 minutes per IP)
- **Security headers** (CSP, HSTS, X-Frame-Options, etc.)
- **Input sanitization** with DOMPurify to prevent XSS
- **Secrets management** via Azure Key Vault
- **HTTPS enforcement** and secure communication

### 📊 Monitoring & Operations
- **Application Insights** integration with structured logging
- **Error tracking** and performance monitoring
- **Request correlation** with unique request IDs
- **Health checks** and diagnostics
- **Comprehensive test coverage** with Jest

### 🔧 DevOps & Deployment
- **Infrastructure as Code** with Bicep templates
- **GitHub Actions CI/CD** with separate infrastructure and application workflows
- **Environment protection** and approval gates for production
- **Automated testing** with coverage reporting
- **Blue-green deployment** capability

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 18+
- Azure Functions Core Tools
- ProtonMail account with app password

### 1. Clone and Install!
```bash
git clone <your-repo-url>
cd contact-form-api
npm install
```

### 2. Configure Local Settings
The `local.settings.json` file contains your development configuration:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "NODE_ENV": "development",
    "EMAIL_SMTP_USER": "your-email@protonmail.com",
    "EMAIL_SMTP_PASSWORD": "your-app-password",
    "RECIPIENT_EMAIL_ADDRESS": "recipient@gmail.com",
    "AZURE_KEYVAULT_URL": ""
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

### 3. Start Development Server
```bash
npm run dev
```

The API will be available at: `http://localhost:7071/api/contact-form`

## 📡 API Usage

### Endpoint
```
POST /api/contact-form
Content-Type: application/json
```

### Request Format
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Website Inquiry",
  "message": "Hello, I'd like to know more about your services."
}
```

### Success Response
```json
{
  "success": true,
  "message": "Thank you for your message. We will get back to you soon.",
  "id": "req_1693834567_abc123def"
}
```

### Error Response
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🌐 Frontend Integration

### Basic JavaScript Example
```javascript
async function submitContactForm(formData) {
  try {
    const response = await fetch('/api/contact-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Message sent successfully!');
    } else {
      alert('Error: ' + result.message);
    }
  } catch (error) {
    alert('Network error. Please try again.');
  }
}

// Usage
const formData = {
  name: document.getElementById('name').value,
  email: document.getElementById('email').value,
  subject: document.getElementById('subject').value,
  message: document.getElementById('message').value
};

submitContactForm(formData);
```

### HTML Form Example
```html
<form id="contactForm">
  <input type="text" id="name" placeholder="Your Name" required>
  <input type="email" id="email" placeholder="Your Email" required>
  <input type="text" id="subject" placeholder="Subject (Optional)">
  <textarea id="message" placeholder="Your Message" required></textarea>
  <button type="submit">Send Message</button>
</form>

<script>
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    name: e.target.name.value,
    email: e.target.email.value,
    subject: e.target.subject.value,
    message: e.target.message.value
  };
  
  await submitContactForm(formData);
});
</script>
```

## 🚀 Azure Deployment

### Prerequisites for Deployment
- Azure subscription
- Azure CLI installed and configured
- GitHub repository with the code

### 1. Setup Azure Service Principal
```bash
# Create service principal for GitHub Actions
az ad sp create-for-rbac \
  --name "sp-contact-form-github" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth
```

### 2. Configure GitHub Secrets
Add these secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |
| `AZURE_TENANT_ID` | Your Azure tenant ID |
| `AZURE_CLIENT_ID` | Service principal client ID |
| `EMAIL_SMTP_USER` | Your ProtonMail email address |
| `EMAIL_SMTP_PASSWORD` | ProtonMail app password |
| `RECIPIENT_EMAIL_ADDRESS` | Email to receive contact forms |

### 3. Deploy with GitHub Actions
1. Push your code to the `main` branch
2. GitHub Actions will automatically:
   - Deploy infrastructure (Azure resources)
   - Build and test the application
   - Deploy the application code

### 4. Manual Deployment (Alternative)
```bash
# Deploy infrastructure
az deployment group create \
  --resource-group rg-contact-form-prod-eus-001 \
  --template-file infrastructure/main.bicep \
  --parameters emailSmtpUser='your-email@protonmail.com' \
  --parameters emailSmtpPassword='your-app-password' \
  --parameters recipientEmailAddress='recipient@gmail.com'

# Build and deploy application
npm run build
# ... (see GitHub Actions workflow for complete steps)
```

## 📧 ProtonMail Configuration

### Setting up App Password
1. Log into your ProtonMail account
2. Go to **Settings** → **Account and Security**
3. Enable **Two-factor authentication** (required for app passwords)
4. Go to **Settings** → **Account and Security** → **App passwords**
5. Create a new app password for "Contact Form API"
6. Use this app password in your configuration (not your regular password)

### SMTP Settings Used
- **Host**: `mail.proton.me`
- **Port**: `587`
- **Security**: `STARTTLS`
- **Authentication**: App Password

## 🧪 Testing & Development

### Available NPM Scripts
```bash
# Development
npm run dev          # Start local development server
npm run build        # Build TypeScript to JavaScript
npm run clean        # Clean build artifacts

# Testing
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## 📊 Monitoring & Troubleshooting

### Application Insights Queries
Access your Function App in Azure Portal → Application Insights to run these queries:

```kusto
// Recent contact form submissions
traces
| where timestamp > ago(1h)
| where message contains "Contact form"
| order by timestamp desc

// Error analysis
exceptions
| where timestamp > ago(24h)
| summarize count() by bin(timestamp, 1h), type

// Performance monitoring
requests
| where timestamp > ago(1h)
| where name contains "contact-form"
| summarize avg(duration) by bin(timestamp, 5m)
```

### Common Issues & Solutions

1. **CORS Errors**
   - Update allowed origins in `infrastructure/modules/function-app.bicep`
   - Ensure your website domain is included

2. **Email Sending Failures**
   - Verify ProtonMail app password is correct
   - Check Azure Key Vault has the right secrets
   - Review Application Insights logs for SMTP errors

3. **Validation Errors**
   - Check request format matches the expected schema
   - Ensure all required fields are provided
   - Review validation rules in `src/shared/validation.ts`

4. **Rate Limiting**
   - Users are limited to 5 requests per 15 minutes
   - Consider adjusting limits in `src/shared/validation.ts`

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `EMAIL_SMTP_USER` | ProtonMail email address | ✅ | - |
| `EMAIL_SMTP_PASSWORD` | ProtonMail app password | ✅ | - |
| `RECIPIENT_EMAIL_ADDRESS` | Email to receive forms | ✅ | - |
| `AZURE_KEYVAULT_URL` | Key Vault URL | Production only | - |
| `NODE_ENV` | Environment | ✅ | development |

### Customizing CORS Origins
Edit `infrastructure/modules/function-app.bicep`:

```bicep
cors: {
  allowedOrigins: [
    'https://yourdomain.com'
    'https://www.yourdomain.com'
    'https://staging.yourdomain.com'
  ]
  supportCredentials: false
}
```

### Rate Limiting Configuration
Modify limits in `src/shared/validation.ts`:

```typescript
class RateLimiter {
  private readonly maxRequests: number = 10;      // Increase limit
  private readonly windowMs: number = 10 * 60 * 1000; // 10 minutes
}
```

## 💰 Cost Estimation

Expected monthly costs for moderate usage (~1000 contact form submissions):

- **Azure Functions** (Consumption Plan): ~$2
- **Storage Account**: ~$1  
- **Key Vault**: ~$1
- **Application Insights**: ~$5
- **Total**: ~$9/month

Costs scale with usage. The serverless architecture ensures you only pay for what you use.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure tests pass: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📜 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 📞 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review Application Insights logs in Azure Portal
3. Open an issue in this GitHub repository

---

**Built with ❤️ using Azure Functions, TypeScript, and modern serverless architecture.**