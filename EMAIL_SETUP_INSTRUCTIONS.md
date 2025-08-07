# Email Setup Instructions for Contact Form

I've created a contact form that will send submissions to patrick@vouchprofile.com. Here's how to complete the setup:

## Option 1: Using Resend (Recommended)

1. **Sign up for Resend** (free tier includes 3,000 emails/month):
   - Go to https://resend.com
   - Sign up for a free account
   - Verify your email domain (vouchprofile.com)

2. **Get your API key**:
   - In your Resend dashboard, go to API Keys
   - Create a new API key
   - Copy the API key (starts with `re_`)

3. **Add environment variable in Netlify**:
   - Go to your Netlify site dashboard
   - Navigate to Site settings > Environment variables
   - Add a new variable:
     - **Key**: `RESEND_API_KEY`
     - **Value**: Your Resend API key (e.g., `re_xxxxxxxxxxxxx`)

4. **Verify domain** (for production):
   - In Resend dashboard, add and verify vouchprofile.com
   - This allows sending from noreply@vouchprofile.com

## Option 2: Alternative Email Services

If you prefer a different service, you can modify `/netlify/functions/contact.ts` to use:
- SendGrid
- Mailgun
- AWS SES
- Or any other email API

## What's Already Implemented

✅ Contact button (fixed bottom-right corner)
✅ Modal contact form with Name, Email, Message fields
✅ Form validation
✅ Netlify function to handle submissions
✅ Email template with proper formatting
✅ Error handling and user feedback
✅ CORS headers for cross-origin requests

## Testing

Once the environment variable is set:

1. Deploy your changes to Netlify
2. Test the contact form on your live site
3. Check your email (patrick@vouchprofile.com) for submissions
4. Check Netlify function logs for any issues

## Backup Logging

Even without the API key, the function will log submissions to Netlify's function logs, so no messages are lost during setup.
