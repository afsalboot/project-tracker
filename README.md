# Project Tracker

A secure, single-user tracker for general projects and Zoho customization work.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI` and a long random `JWT_SECRET`.
3. Run `npm.cmd install`.
4. Run `npm.cmd run dev`.
5. Open `/login` and use **Set up owner account** once.

Registration closes automatically after the first account exists. No seed data is included or created.

## Validation

```powershell
npm.cmd run lint
npm.cmd run build
```
