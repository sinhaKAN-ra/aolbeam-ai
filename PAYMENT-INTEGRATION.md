# Payment Integration Guide

This document outlines the steps to set up payment integration with Cashfree and PayPal.

## Environment Variables

Add the following environment variables to your `.env` file:

```
# Cashfree Configuration
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_ENV=sandbox # or 'production' for live environment

# PayPal Configuration
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET_KEY=your_paypal_secret_key
PAYPAL_ENV=sandbox # or 'production' for live environment

# Webhook Configuration
PAYMENT_WEBHOOK_SECRET=your_webhook_secret

# Application URL (used for callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Update with your production URL
```

## Setup Instructions

### 1. Cashfree Setup

1. Sign up for a Cashfree account at [https://www.cashfree.com/](https://www.cashfree.com/)
2. Create a new app in the Cashfree dashboard
3. Get your API keys (App ID and Secret Key)
4. Configure your webhook URL in the Cashfree dashboard:
   - Webhook URL: `{YOUR_APP_URL}/api/payments/webhook`
   - Events to subscribe: All payment events

### 2. PayPal Setup

1. Sign up for a PayPal Business account at [https://www.paypal.com/business](https://www.paypal.com/business)
2. Go to PayPal Developer Dashboard and create a new app
3. Get your API credentials (Client ID and Secret)
4. Configure your return and cancel URLs in the PayPal app settings:
   - Return URL: `{YOUR_APP_URL}/payment/success`
   - Cancel URL: `{YOUR_APP_URL}/pricing`

### 3. Webhook Setup

1. In PayPal Developer Dashboard, set up a webhook:
   - Webhook URL: `{YOUR_APP_URL}/api/payments/webhook`
   - Events to subscribe: All payment events

## Testing

### Test Cards (Sandbox Mode)

**Cashfree Test Cards:**
- Card Number: 4111 1111 1111 1111
- CVV: 123
- Expiry: Any future date
- OTP: 123456

**PayPal Sandbox Accounts:**
- Use the test buyer accounts created in PayPal Sandbox

## Troubleshooting

1. **Webhook Notifications Not Working**
   - Verify the webhook URL is correctly configured in both Cashfree and PayPal dashboards
   - Check your server logs for any errors
   - Ensure your server is publicly accessible (ngrok can be used for local development)

2. **Payment Verification Failing**
   - Verify your API keys are correct
   - Ensure you're using the correct environment (sandbox vs production)
   - Check the payment status in the respective dashboards

## Security Considerations

1. Never commit your API keys or secrets to version control
2. Use environment variables for all sensitive information
3. Implement proper input validation and error handling
4. Use HTTPS in production to secure all API calls
5. Regularly rotate your API keys and secrets
