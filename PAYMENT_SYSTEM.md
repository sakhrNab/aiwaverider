# Payment System Documentation

This document provides an overview of the payment system implementation, including supported payment methods, integration details, and troubleshooting tips.

## Supported Payment Methods

The payment system supports the following payment methods:

1. **Credit/Debit Cards** - Available globally
2. **Google Pay** - Direct integration with native payment sheet
3. **Apple Pay** - Direct integration with native payment sheet
4. **SEPA Direct Debit** - Available in EU countries
5. **iDEAL** - Available in the Netherlands, Belgium, and Germany

## Integration Details

### Backend Implementation

The payment system is implemented using Stripe as the payment processor. The backend routes are defined in `backend/routes/payments.js` and include:

- `/api/payments/create-stripe-checkout` - Creates a Stripe checkout session for card, SEPA, and iDEAL
- `/api/payments/create-paypal-order` - Creates a PayPal order (separate integration)
- `/api/payments/payment-methods` - Returns available payment methods based on country
- `/api/payments/process-google-pay` - Processes Google Pay payments directly
- `/api/payments/process-apple-pay` - Processes Apple Pay payments directly
- `/api/payments/validate-apple-pay-merchant` - Validates Apple Pay merchant for direct integration

### Frontend Implementation

The frontend components for payment processing include:

- `src/components/PaymentMethodSelector.jsx` - Main component for selecting payment methods
- `src/components/GooglePayButton.jsx` - Google Pay button with direct integration
- `src/components/ApplePayButton.jsx` - Apple Pay button with direct integration
- `src/services/paymentApi.js` - API service for payment processing

### Digital Wallet Integration

Google Pay and Apple Pay are implemented with direct integration:

#### Google Pay
1. Uses the Google Pay API directly
2. Shows the native Google Pay payment sheet when clicked
3. Processes the payment token through our backend
4. No redirection to Stripe's checkout page

#### Apple Pay
1. Uses the Apple Pay JS API directly
2. Shows the native Apple Pay payment sheet when clicked
3. Processes the payment token through our backend
4. No redirection to Stripe's checkout page

## Configuration

### Environment Variables

The payment system requires the following environment variables:

```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
FRONTEND_URL=http://localhost:5173
REACT_APP_GOOGLE_MERCHANT_ID=your_google_merchant_id
REACT_APP_APPLE_MERCHANT_ID=merchant.com.yourcompany.app
```

### Country Detection

The system automatically detects the user's country and shows appropriate payment methods based on the detected country. For example, SEPA Direct Debit and iDEAL are only shown to users in EU countries.

## Testing

### Test Scripts

The repository includes test scripts for verifying payment integrations:

- `backend/test-direct-wallets.js` - Tests direct Google Pay and Apple Pay integrations
- `backend/test-digital-wallets.js` - Tests Google Pay and Apple Pay through Stripe Checkout
- `backend/test-stripe.js` - Tests regular card payments
- `backend/test-sepa.js` - Tests SEPA Direct Debit payments
- `backend/test-ideal.js` - Tests iDEAL payments

To run a test script:

```bash
cd backend
node test-direct-wallets.js
```

### Test Cards

For testing in development, you can use Stripe's test cards:

- **Regular Card**: 4242 4242 4242 4242
- **3D Secure**: 4000 0000 0000 3220
- **Declined**: 4000 0000 0000 0002

For SEPA Direct Debit, use IBAN: DE89370400440532013000

## Troubleshooting

### Common Issues

1. **404 Error on Payment Endpoint**
   - Ensure the backend server is running
   - Check that the API URL is correctly configured
   - Make sure the server has been restarted after adding new routes

2. **500 Error on Payment Processing**
   - Check the server logs for detailed error messages
   - Verify that the request payload matches the expected format
   - Ensure Stripe API keys are correctly configured

3. **Digital Wallet Not Appearing**
   - Ensure you're using a supported browser and device
   - For Google Pay: Chrome on Android or desktop
   - For Apple Pay: Safari on iOS or macOS
   - Check that you have cards set up in your digital wallet

### Debugging

The payment system includes extensive logging to help with debugging:

- Frontend logs payment requests and responses to the console
- Backend logs detailed information about payment processing
- Error responses include detailed information about what went wrong

## Future Improvements

Planned improvements to the payment system include:

1. Adding support for more payment methods
2. Implementing saved payment methods for returning customers
3. Adding subscription support
4. Enhancing error handling and user feedback
5. Implementing better analytics and reporting

## Support

For questions or issues with the payment system, please contact the development team or create an issue in the repository. 