# PayPal Integration Setup Guide

## Error Diagnosis
You're encountering an error with the PayPal integration:
```
SDK Validation error: 'client-id not recognized for either production or sandbox: AYxYj_8v1xxWiU_KzFN2VeVjjpMpv2lECZaT0cvA49dBdHh2qkEJHBXM3-aSB9Dw-Lfbj5sYYkTw2RwN'
```

This means the PayPal client ID used in your application isn't valid or doesn't exist in PayPal's systems.

## Solution Steps

### 1. Get Valid PayPal Credentials

1. Go to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Log in or create a new account
3. Navigate to "My Apps & Credentials"
4. Select the "Sandbox" tab (for testing) or "Live" tab (for production)
5. Click "Create App"
6. Give your app a name (e.g., "AI Waverider")
7. Select "Merchant" as the app type
8. Click "Create App"
9. Once created, you'll see your Client ID and Secret
10. Copy the Client ID

### 2. Update Your Environment Configuration

Add the PayPal Client ID to your environment variables:

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add the following line:
   ```
   VITE_PAYPAL_CLIENT_ID=YOUR_PAYPAL_CLIENT_ID
   ```
3. Replace `YOUR_PAYPAL_CLIENT_ID` with the value you copied from the PayPal Developer Dashboard

### 3. Update Your App.jsx

We've already updated your App.jsx to use the environment variable:

```javascript
// PayPal initial options
const paypalOptions = {
  "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "sb", // Use sandbox default when testing
  currency: "USD",
  intent: "capture",
  "disable-funding": "paylater,venmo,credit", // Optional: disable specific payment methods
};
```

The `"sb"` value is a special value that works with PayPal Sandbox for testing. However, it has limited functionality, so using your actual Client ID is recommended.

### 4. Testing PayPal Integration

1. For testing payments in sandbox mode, use these test accounts:
   - Business account: The one associated with your app
   - Personal account: Create test accounts in the Sandbox > Accounts section

2. Test buyer credentials:
   - Email: `sb-buyer@example.com` (check your sandbox accounts for actual values)
   - Password: Use the one set in your sandbox account

### 5. Going to Production

When you're ready to go live:

1. Create a live PayPal app in the "Live" tab of the Developer Dashboard
2. Get your live Client ID
3. Update your environment variable for production:
   ```
   VITE_PAYPAL_CLIENT_ID=YOUR_LIVE_CLIENT_ID
   ```

## Troubleshooting

If you continue to experience issues:

1. **Network Errors**: Check if any content blockers or firewalls are preventing access to PayPal's servers
2. **API Credentials**: Ensure you're using the correct credentials for your environment (sandbox vs. live)
3. **Browser Console**: Check for additional errors that might give more context
4. **PayPal Status**: Check [PayPal's Status Page](https://status.paypal.com/) for any ongoing issues

## Resources

- [PayPal React Components Documentation](https://paypal.github.io/react-paypal-js/)
- [PayPal Developer Documentation](https://developer.paypal.com/docs/business/) 