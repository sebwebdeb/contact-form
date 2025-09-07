using '../main.bicep'

param projectName = 'contact-form'
param environment = 'prod'
param location = 'eastus'
param tags = {
  Project: 'ContactFormAPI'
  Environment: 'prod'
  ManagedBy: 'Bicep'
  Owner: 'Production Team'
}

// These should be provided via Azure CLI or GitHub Actions secrets
param emailSmtpUser = ''
param emailSmtpPassword = ''
param recipientEmailAddress = ''