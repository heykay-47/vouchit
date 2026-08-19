# VouchIt Product Truth

## Positioning

VouchIt is a prototype marketplace for unused digital vouchers. Customers can pass on vouchers they cannot use, and businesses can publish campaign inventory for customers who can use it before expiry.

This is an implemented B2B/B2C workflow, not a claim of payment processing, voucher fulfillment, guaranteed redemption, or customer scale. No social-proof metrics or customer logos are presented as product evidence.

## Customer Experience

Customers can browse public community and business campaign vouchers. Authenticated customers can claim available vouchers and use the community features: donate a voucher, favorite it, comment, report an invalid voucher, create a voucher request, and view relevant history.

Customer signup creates the `customer` role. Business accounts cannot use customer mutation actions, even if they can inspect public voucher information.

## Business Experience

Business signup creates a `business` role and a business profile. A business can:

1. Create a campaign draft with brand, platform, category, terms, image, and expiry details.
2. Upload CSV inventory and review Papa Parse output with accepted rows and row-level rejections.
3. Confirm valid inventory and issue an invoice.
4. Record matching external or offline settlement evidence.
5. Publish inventory only after the invoice is marked paid by the recorded settlement flow.
6. Observe aggregate voucher views and claims for paid active or completed campaigns when analytics are available.

The prototype does not process card payments, verify a bank transfer, deliver vouchers outside the application, or guarantee that a claimed voucher will work with its provider.

## Pricing And Settlement

Campaign pricing is fixed at `₹99 + ₹2 per confirmed campaign voucher`. The server stores integer paise and calculates each invoice as:

```text
9900 + 200 * quantity
```

Invoices capture the price snapshot and campaign quantity. Settlement records the external payment reference, amount, and date supplied by the business. A settlement is accepted only when it matches the invoice and valid date bounds; it is evidence recording, not payment processing.

## Current Evidence

The demo seed includes customer and business identities, a paid active campaign with claimed and remaining vouchers, nonzero observed views, paid invoices, and an expired/completed campaign. These are deterministic fixtures for demonstrating the implemented flow, not social proof or production usage statistics.
