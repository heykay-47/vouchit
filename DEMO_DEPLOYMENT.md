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

After adding `MONGODB_URI` locally, choose a local-only demo password without placing it in shell history:

```bash
read -rsp "Demo password: " DEMO_PASSWORD
export DEMO_PASSWORD
npm run seed:demo
unset DEMO_PASSWORD
```

Keep `DEMO_PASSWORD` out of committed files and shell history. The seed script is idempotent and requires this caller-provided value; it does not print account identifiers or passwords. Run it again before recruiter calls to restore sample customer data, the business profile, paid campaign invoices, one active grouped campaign offer with one prior claim and two remaining codes, observed views, and expired campaign evidence.

## 4. Recruiter Demo Flow

1. Open the Vercel URL.
2. Browse the catalog without logging in. Show server-side search, platform/category/source and expiring-soon filters, expiry-first ordering, individual available community vouchers, and eligible active grouped campaigns with remaining claimable inventory.
3. Sign in with a seeded customer identity and the locally selected password to show the customer role, favorite a community voucher, and redeem it through the community-only flow.
4. Open Community to show requests, leaderboard, activity, comments, and customer history.
5. Sign in with the seeded business identity and the locally selected password to show the business role and campaign workspace.
6. Create or open a campaign draft, enter campaign details and expiry, then upload a CSV inventory.
7. Review Papa Parse accepted rows and rejected rows, confirm the accepted inventory, and issue the invoice.
8. Record matching external or offline settlement evidence. VouchIt records the evidence; it does not process the payment.
9. Return to the catalog to show that settlement-gated inventory appears as one coherent grouped campaign offer with remaining inventory. The seeded customer `demo@vouchit.app` already claimed from this campaign; use `maya@vouchit.app` to demonstrate a fresh claim. Each customer can claim only one code from the campaign.
10. Return to the business workspace to show the paid invoice, active campaign, claimed and remaining inventory, observed views, and claims. The seeded expired campaign provides completed-history evidence.

## 5. Free-Tier Notes

- Vercel Hobby is free for personal, non-commercial demos.
- MongoDB Atlas M0 is free but has shared-tier limits and may pause after extended inactivity.
- If Atlas pauses, resume the cluster from the Atlas dashboard before a demo.
- Do not commit real `.env` files or production secrets.
- The Docker image is a static frontend nginx image only. Vercel remains the end-to-end deployment for the frontend and Express API.
