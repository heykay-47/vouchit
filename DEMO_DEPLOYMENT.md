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
Customer email: demo@vouchit.app
Business email: business@vouchit.app
Default password: DemoPass123!
```

The seed script is idempotent. Run it again before recruiter calls to restore sample customer data, the business profile, paid campaign invoices, claimed and remaining campaign vouchers, observed views, and expired campaign evidence. Set `DEMO_PASSWORD` to use another password; the seed does not print passwords.

## 4. Recruiter Demo Flow

1. Open the Vercel URL.
2. Browse community and business campaign vouchers without logging in.
3. Log in as `demo@vouchit.app` to show the customer role, favorite a voucher, and claim an available voucher.
4. Open Community to show requests, leaderboard, activity, comments, and customer history.
5. Log out and log in as `business@vouchit.app` to show the business role and campaign workspace.
6. Create or open a campaign draft, enter campaign details and expiry, then upload a CSV inventory.
7. Review Papa Parse accepted rows and rejected rows, confirm the accepted inventory, and issue the invoice.
8. Record matching external or offline settlement evidence. VouchIt records the evidence; it does not process the payment.
9. Return to the public browse view to show the settlement-gated campaign vouchers, then claim one as the customer.
10. Return to the business workspace to show the paid invoice, active campaign, claimed/remaining inventory, observed views, and claims. The seeded expired campaign provides completed-history evidence.

## 5. Free-Tier Notes

- Vercel Hobby is free for personal, non-commercial demos.
- MongoDB Atlas M0 is free but has shared-tier limits and may pause after extended inactivity.
- If Atlas pauses, resume the cluster from the Atlas dashboard before a demo.
- Do not commit real `.env` files or production secrets.
- The Docker image is a static frontend nginx image only. Vercel remains the end-to-end deployment for the frontend and Express API.
