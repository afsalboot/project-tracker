# Project 1 Workspace

A secure, single-user tracker for general projects and Zoho customization work.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI`, a long random `JWT_SECRET`, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM`.
3. Run `npm.cmd install`.
4. Run `npm.cmd run dev`.
5. Open `/login` and use **Set up owner account** once.

Sign-up requires the six-digit code emailed through Resend before the first session is created. Existing verified accounts sign in with their password normally. The sender address in `AUTH_EMAIL_FROM` must use a domain verified by your email provider.

## Validation

```powershell
npm.cmd run lint
npm.cmd run build
```
