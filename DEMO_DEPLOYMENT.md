# Vercel + MongoDB Atlas Demo Setup

This project is ready for a free recruiter demo on Vercel Hobby plus MongoDB Atlas M0.

## 1. Create MongoDB Atlas M0

1. Create a MongoDB Atlas account.
2. Create a new project named `VouchIt Demo`.
3. Build a database and choose the free `M0` shared cluster.
4. Create a database user with a generated password.
5. Network access:
   - For a quick recruiter demo, add `0.0.0.0/0`.
   - For a tighter setup, use a paid static egress option later. Vercel Hobby does not provide fixed outbound IPs.
6. Copy the connection string and replace `<password>` and database name:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/vouchit?retryWrites=true&w=majority
```

## 2. Configure Vercel

Import the GitHub repository in Vercel. Keep defaults:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Add environment variables in Vercel Project Settings:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/vouchit?retryWrites=true&w=majority
JWT_SECRET=<generate-a-long-random-secret>
NODE_ENV=production
```

Leave `CORS_ORIGIN` empty on Vercel because the frontend and API share the same domain.

## 3. Seed Demo Data

After adding `MONGODB_URI` locally, run:

```sh
npm run seed:demo
```

Optional custom demo password:

```sh
DEMO_PASSWORD="your-password" npm run seed:demo
```

Demo login:

```text
Email: demo@vouchit.app
Password: DemoPass123!
```

The seed script is idempotent. Run it again before recruiter calls to restore sample users, vouchers, requests, comments, notifications, favorites, and redemption history.

## 4. Recruiter Demo Flow

1. Open the Vercel URL.
2. Browse vouchers without logging in.
3. Log in with the demo account.
4. Favorite a voucher.
5. Redeem one active voucher.
6. Donate a new voucher.
7. Open Community to show requests, leaderboard, and activity.
8. Open Dashboard/Settings to show authenticated account state.

## 5. Free-Tier Notes

- Vercel Hobby is free for personal, non-commercial demos.
- MongoDB Atlas M0 is free but has shared-tier limits and may pause after extended inactivity.
- If Atlas pauses, resume the cluster from the Atlas dashboard before a demo.
- Do not commit real `.env` files or production secrets.
