# Payment System Migration Checklist

This document provides a comprehensive checklist for migrating your payment system from test to production environment.

## API Keys and Credentials

- [ ] Replace Stripe test secret key (`sk_test_...`) with production key (`sk_live_...`)
  - [ ] Update in server environment variables
  - [ ] Remove any hardcoded test keys from code
  
- [ ] Replace Stripe test publishable key (`pk_test_...`) with production key (`pk_live_...`)
  - [ ] Update in `.env.production` file for the frontend
  - [ ] Verify it's correctly loaded in the application

- [ ] Update PayPal credentials
  - [ ] Replace sandbox client ID with production client ID
  - [ ] Replace sandbox secret with production secret

- [ ] Update any other payment service credentials (Apple Pay, Google Pay, etc.)

## Webhook Configuration

- [ ] Create new webhook endpoints in Stripe dashboard for production
  - [ ] Set endpoint URL to `https://your-production-domain.com/api/payments/stripe-webhook`
  - [ ] Select all relevant events to listen for
  - [ ] Get the new webhook signing secret for production

- [ ] Update webhook secret in production environment
  - [ ] Set `STRIPE_WEBHOOK_SECRET` with the new signing secret
  - [ ] Test webhook functionality using Stripe CLI:
    ```
    stripe listen --forward-to your-production-domain.com/api/payments/stripe-webhook
    ```

- [ ] Set up webhook monitoring
  - [ ] Implement logging for webhook events
  - [ ] Create alerts for webhook failures

## Payment Method-Specific Configuration

### Stripe Card Payments

- [ ] Verify test transactions work with test cards
- [ ] Set up proper error handling for declined cards
- [ ] Configure fraud detection settings in Stripe dashboard
- [ ] Set statement descriptor in Stripe dashboard

### Google Pay

- [ ] Change environment from 'TEST' to 'PRODUCTION' in Google Pay configuration
- [ ] Verify domain with Google Pay in the Google Pay & Wallet Console
- [ ] Add the required DNS TXT record for domain verification
- [ ] Set your actual merchant ID in the integration
- [ ] Test with real Google Pay accounts on production

### Apple Pay

- [ ] Register your domain with Apple Pay
- [ ] Create and upload the required domain association file
- [ ] Verify your domain is registered properly
- [ ] Test with real Apple Pay accounts on production

### Alternative Payment Methods

- [ ] Verify all alternative payment methods (iDEAL, SEPA, etc.) are enabled in your Stripe dashboard
- [ ] Complete any additional verification required for specific payment methods
- [ ] Test each payment method in production mode before launch

## Security and Compliance

- [ ] Ensure PCI compliance requirements are met
  - [ ] Use Stripe Elements for card collection to reduce PCI scope
  - [ ] Verify no card data is logged or stored in your system
  
- [ ] Set up fraud detection
  - [ ] Configure Stripe Radar rules if available
  - [ ] Implement additional security checks for high-value transactions
  
- [ ] Address data protection requirements
  - [ ] Update privacy policy to cover payment processing
  - [ ] Ensure GDPR compliance if serving EU customers
  - [ ] Ensure CCPA compliance if serving California customers

## Infrastructure and Environment

- [ ] Verify HTTPS is properly configured for all payment endpoints
- [ ] Set up proper monitoring for payment services
  - [ ] Create alerts for unusual failure rates
  - [ ] Monitor webhook processing
  
- [ ] Configure logging
  - [ ] Ensure sensitive data is never logged (card numbers, CVV, etc.)
  - [ ] Set up error reporting to capture payment failures
  
- [ ] Implement rate limiting to prevent abuse

## User Experience

- [ ] Update error messages to be user-friendly in production
- [ ] Implement appropriate success/failure screens
- [ ] Set up email notifications for payment events
- [ ] Test the complete user journey from start to finish

## Testing Before Go-Live

- [ ] Create a staging environment with production credentials
- [ ] Test the complete payment flow with real cards (but minimal amounts)
- [ ] Verify successful payments are properly recorded
- [ ] Test refund functionality
- [ ] Test subscription creation and management if applicable
- [ ] Test payment failure scenarios and recovery

## Business Operations

- [ ] Set up financial reconciliation processes
- [ ] Configure payout schedule in Stripe dashboard
- [ ] Set up reporting and analytics for payment data
- [ ] Create documentation for handling payment disputes and chargebacks

## Post-Deployment

- [ ] Monitor initial transactions closely
- [ ] Have a rollback plan in case of critical issues
- [ ] Schedule a payment system health check after one week
- [ ] Gather feedback on the payment experience

## Final Verification

- [ ] Verify all test mode code and keys are removed from production
- [ ] Confirm no test transactions appear in production dashboards
- [ ] Ensure all payment methods show correctly in the checkout UI
- [ ] Complete end-to-end test purchases with each payment method 