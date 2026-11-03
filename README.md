# Instamilligram

An Instagram-inspired social web app prototype with a real username/password backend.

**Live site:** https://kushalthedeveloper.github.io/instamilligram/  
**Repository:** https://github.com/kushalthedeveloper/instamilligram

## Implemented

- Username + password signup and login — no email or phone number required
- Passwords hashed with bcrypt (cost 12); raw passwords are never stored
- Opaque random sessions; only a SHA-256 hash of each session token is stored
- Login and signup rate limits
- Private profiles by default, with follow requests and approval
- Persistent posts (HTTPS image URL + caption), likes, comments and profile edits
- User search, report submission and block controls in the backend
- Row Level Security enabled on all application tables; direct browser access is revoked
- Supabase secret key is only used inside the Edge Function, never shipped to the browser

## Free-tier architecture

- Static frontend: GitHub Pages
- Database and API: Supabase project in Mumbai (ap-south-1)
- Backend function: instamilligram-api

The Supabase project was quoted at $0/month when created. Free-tier quotas and availability can change; usage beyond included limits may require a paid plan. Do not enable paid upgrades without reviewing their price.

## Account notes

- Usernames are 3–24 lowercase letters, numbers or underscores.
- Passwords must be at least 10 characters and no more than 72 UTF-8 bytes.
- Keep your password private and use one that you do not use on other websites.
- Profiles start private. Approve follow requests before followers can see private posts.
- Signup and login use username + password only. A verified email address or mobile number can be added later from Profile → Account recovery for password resets.
- Session tokens are kept in the current browser tab's session storage and expire on the server after 30 days.

## Current limitations

This is an early MVP, not a full Instagram replacement. Direct photo uploads, stories, reels, private messaging, push notifications, and a moderation dashboard are not implemented. Password-recovery flows are built, but delivery is inactive until provider secrets are configured. Posts currently accept an HTTPS image URL. Report submission and blocking endpoints exist, but there is not yet a staffed moderation workflow.

## Security design

The public frontend uses only the Supabase publishable key. The backend function uses Supabase's server-side secret from its environment. Application tables have RLS enabled and no browser-facing policies; requests go through the API function. Never put a Supabase secret/service-role key in this repository or browser code.

## Main files

- index.html — app shell and auth screen
- styles.css — responsive UI
- app.js — frontend and API integration


## Account recovery setup

The app supports either a verified email address or a verified mobile number for password recovery. Users add the contact from **Profile → Account recovery**, then verify a one-time code. Signup and normal login do not request contact details or OTP.

The recovery API is deployed, but message delivery needs provider credentials configured in **Supabase Dashboard → Edge Functions → Secrets**:

- Required: `RECOVERY_CODE_PEPPER` — a long random secret used to hash recovery codes.
- Email: `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (the sender address must belong to a domain verified with Resend).
- Optional SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`. SMS delivery may incur provider charges; do not configure it unless the owner has reviewed the price and approved it.

Until the required secrets are configured, users cannot receive recovery codes. No API keys or provider secrets belong in this public GitHub repository or browser code. Recovery codes expire after 10 minutes, allow at most five verification attempts, and successful password resets revoke all active sessions.

The current release still uses image URLs rather than direct uploads. Messages, stories, reels, account deletion, and a full moderation dashboard remain future work.
