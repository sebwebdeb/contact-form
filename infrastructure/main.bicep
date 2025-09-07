@description('Main Bicep template for Contact Form API infrastructure')
@minLength(1)
@maxLength(64)
param projectName string = 'contact-form'

@description('Environment (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Azure region')
param location string = resourceGroup().location

@description('Resource tags')
param tags object = {
  Project: 'ContactFormAPI'
  Environment: environment
  ManagedBy: 'Bicep'
}


@description('Key Vault secrets')
@secure()
param emailSmtpUser string

@secure()
param emailSmtpPassword string

@secure()
param recipientEmailAddress string

// Variables
var resourcePrefix = '${projectName}-${environment}-eus-001'
var storageAccountName = replace('st${resourcePrefix}', '-', '')
var functionAppName = 'func-${resourcePrefix}'
var appServicePlanName = 'asp-${resourcePrefix}'
var keyVaultName = 'kv-${resourcePrefix}'
var appInsightsName = 'ai-${resourcePrefix}'
var logAnalyticsName = 'law-${resourcePrefix}'

// Log Analytics Workspace
module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'logAnalytics'
  params: {
    name: logAnalyticsName
    location: location
    tags: tags
  }
}

// Application Insights
module appInsights 'modules/app-insights.bicep' = {
  name: 'appInsights'
  params: {
    name: appInsightsName
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
  }
}

// Storage Account
module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    name: storageAccountName
    location: location
    tags: tags
  }
}

// Key Vault
module keyVault 'modules/key-vault.bicep' = {
  name: 'keyVault'
  params: {
    name: keyVaultName
    location: location
    tags: tags
    emailSmtpUser: emailSmtpUser
    emailSmtpPassword: emailSmtpPassword
    recipientEmailAddress: recipientEmailAddress
  }
}

// Function App
module functionApp 'modules/function-app.bicep' = {
  name: 'functionApp'
  params: {
    functionAppName: functionAppName
    appServicePlanName: appServicePlanName
    location: location
    tags: tags
    storageAccountName: storage.outputs.storageAccountName
    appInsightsInstrumentationKey: appInsights.outputs.instrumentationKey
    keyVaultUri: keyVault.outputs.keyVaultUri
    keyVaultName: keyVault.outputs.keyVaultName
  }
}

// Grant Key Vault access to Function App
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-07-01' = {
  name: '${keyVaultName}/add'
  properties: {
    accessPolicies: [
      {
        tenantId: functionApp.outputs.functionAppIdentityTenantId
        objectId: functionApp.outputs.functionAppIdentityPrincipalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

// Outputs
output functionAppName string = functionApp.outputs.functionAppName
output functionAppUrl string = functionApp.outputs.functionAppUrl
output keyVaultName string = keyVault.outputs.keyVaultName
output keyVaultUri string = keyVault.outputs.keyVaultUri
output storageAccountName string = storage.outputs.storageAccountName
output appInsightsName string = appInsights.outputs.appInsightsName