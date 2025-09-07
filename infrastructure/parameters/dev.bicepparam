using '../main.bicep'

param projectName = 'contact-form'
param environment = 'dev'
param location = 'eastus'
param tags = {
  Project: 'ContactFormAPI'
  Environment: 'dev'
  ManagedBy: 'Bicep'
  Owner: 'Development Team'
}

// These should be provided via Azure CLI or GitHub Actions secrets
param emailSmtpUser = ''
param emailSmtpPassword = ''
param recipientEmailAddress = ''