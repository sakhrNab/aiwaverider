# Production Configuration Guide

This guide explains how to properly configure the application for production deployment.

## Environment Variables

Create a `.env.production` file with the following configuration (replace placeholders with actual values):

```bash
# Environment
VITE_NODE_ENV=production
NODE_ENV=production

# API Configuration
VITE_API_URL=https://api.aiwaverider.com
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# Firebase Configuration (replace with your Firebase credentials)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key

# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=your_production_paypal_client_id

# Google Pay Configuration
VITE_GOOGLE_PAY_ENVIRONMENT=PRODUCTION
VITE_GOOGLE_PAY_GATEWAY=stripe
VITE_MERCHANT_NAME=AI Wave Rider

# Apple Pay Configuration
VITE_APPLE_PAY_MERCHANT_ID=merchant.com.aiwaverider.production

# Monitoring & Logging
VITE_SENTRY_DSN=https://your_sentry_project@sentry.io/project_id
VITE_LOGROCKET_APP_ID=your_logrocket_app_id

# Microsoft Authentication (if applicable)
VITE_MICROSOFT_CLIENT_ID=your_client_id
VITE_MICROSOFT_CALLBACK_URL=https://api.aiwaverider.com/api/auth/microsoft/callback

# YouTube API (if applicable)
VITE_YOUTUBE_API_KEY=your_youtube_api_key

# Feature Flags
VITE_ENABLE_PAYMENT_SIMULATION=false
VITE_ENABLE_CRYPTO=true
VITE_ENABLE_APPLE_PAY=true
VITE_ENABLE_GOOGLE_PAY=true
VITE_ENABLE_SEPA=true
VITE_SHOW_TEST_FEATURES=false
```

## Backend Configuration

The backend server also requires proper configuration. Create a `.env` file on your server with these variables:

```bash
# Environment
NODE_ENV=production

# Server
PORT=8080
CORS_ALLOWED_ORIGINS=https://aiwaverider.com
FRONTEND_URL=https://aiwaverider.com

# Stripe
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal
PAYPAL_CLIENT_ID=your_production_paypal_client_id
PAYPAL_CLIENT_SECRET=your_production_paypal_client_secret

# Firebase Admin (Service Account)
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./service-account.json

# Email Configuration
SMTP_HOST=smtp.provider.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=support@aiwaverider.com
SMTP_PASS=your_smtp_password
FROM_EMAIL=support@aiwaverider.com
FROM_NAME=AI Wave Rider

# Session/Security
SESSION_SECRET=your_strong_session_secret

# Database
DB_CONNECTION_STRING=your_production_database_connection_string

# Monitoring
SENTRY_DSN=https://your_backend_sentry_project@sentry.io/project_id
```

## Security Best Practices

1. **Never commit real credentials to version control**
   - Use `.gitignore` to exclude `.env.production` and other sensitive files
   - Consider using a secrets manager service for production

2. **Rotate credentials regularly**
   - Schedule regular rotation of API keys and secrets
   - Document procedures for emergency credential rotation

3. **Limit access to production credentials**
   - Use a secure method to share credentials with team members
   - Implement role-based access control for sensitive operations

## Building for Production

To build the application for production, run:

```bash
npm run build
```

This will create optimized production-ready files in the `dist` directory.

## Production-Ready Features

The application now includes several production-ready features:

### 1. Enhanced API Client (`apiClient.js`)

The enhanced API client provides:

- **Request timeouts** - Prevents hanging requests
- **Automatic retries** with exponential backoff for transient failures
- **Comprehensive error handling** - Structured error objects
- **Request caching** - Improves performance for GET requests
- **Logging integration** - Detailed request/response logging
- **Health check support** - API availability monitoring

Example usage:
```javascript
import apiClient from '../services/apiClient';

// GET request with timeout and retries
const data = await apiClient.get('https://api.example.com/data', {
  timeout: 5000,
  retries: 3,
  tags: ['important-data']
});

// POST request with custom options
const result = await apiClient.post('https://api.example.com/users', {
  name: 'John Doe',
  email: 'john@example.com'
}, {
  timeout: 10000
});
```

### 2. Health Check System (`healthCheck.js`)

The health check system monitors:

- **API availability** - Checks if the API is responsive
- **Payment provider status** - Monitors Stripe, PayPal, and SEPA
- **Automatic scheduling** - Runs periodic checks in production
- **Logging integration** - Records health status for monitoring

Health checks are automatically scheduled in production. You can also manually trigger checks:

```javascript
import { runAllHealthChecks } from '../utils/healthCheck';

// Run all health checks
const status = await runAllHealthChecks();
console.log('System status:', status.status);
console.log('Checks:', status.checks);
```

## Payment Methods in Production

All payment methods now use proper environment-dependent configuration from the centralized `config.js` file. Here's what you need to ensure for each payment method:

### Stripe
- Replace test keys with production keys in environment variables
- Update webhook endpoints to production URLs
- Complete all verification requirements in Stripe dashboard
- Enable webhook signature verification for security

### PayPal
- Update to live client ID and secret in environment variables
- Set up IPN (Instant Payment Notification) for production URLs
- Enable proper transaction logging
- Implement proper order validation

### SEPA Credit Transfer
- Ensure Stripe account is verified for SEPA
- Update terms of service and privacy policy
- Update to production IBAN and BIC
- Implement proper mandate management

### Google Pay / Apple Pay
- Update environment from TEST to PRODUCTION in configuration
- Complete domain verification for production
- Update merchant IDs for production use
- Test on actual devices before launch

## Error Logging & Monitoring

The application now uses:

1. **Structured logging** via the centralized `logService.js`
2. **External monitoring** with Sentry and LogRocket integration
3. **Transaction tracking** with sensitive data redaction
4. **Environment-aware initialization** of monitoring services

### Monitoring Setup

For complete monitoring coverage:

1. **Configure alerts in Sentry** for:
   - Unusual error rates
   - Payment processing failures
   - API timeout issues

2. **Set up LogRocket session monitoring** to:
   - Track user payment flows
   - Identify UI/UX issues in checkout
   - Analyze performance bottlenecks

3. **Implement health checks** for:
   - Payment provider availability
   - API endpoint responsiveness
   - Database connectivity

To verify that monitoring is working in production:
1. Check Sentry dashboard for incoming events
2. Verify LogRocket is capturing sessions
3. Confirm transaction logging is working with your analytics platform 