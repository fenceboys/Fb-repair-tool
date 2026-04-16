# Fence Boys Repair Tool - Handoff Document

**Last Updated:** April 16, 2026
**Project:** fence-boys-repair-tool
**Live URL:** https://repair.fenceboys.com
**Repo:** https://github.com/fenceboys/Fb-repair-tool

---

## Current Build Status: Production Ready

The repair quoting tool is fully functional for Colt's field use.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (bucket: `pdfs`)
- **Auth:** Supabase Auth (Magic Link)
- **Styling:** Tailwind CSS
- **Payments:** Stripe
- **Notifications:** Slack (implemented), SMS/Email (placeholder)
- **Hosting:** Vercel

---

## User Roles & Access

| Role | View | Access |
|------|------|--------|
| `salesperson` | `/` (QuotesList - mobile-optimized) | Create/edit quotes, send proposals |
| `admin` | `/dashboard` (full table view) | All salesperson features + dashboard + admin settings |

Roles stored in `profiles` table. Admin users can toggle between views via header links.

---

## Core Workflow

### Sales Flow (Colt)
1. **Create Quote** → New quote starts in `scheduling_quote` status
2. **Build Quote** → Fill customer info, pricing, repair description
3. **Review PDF** → View PDF / Share PDF buttons (separate actions)
4. **Send Proposal** → SMS opens native Messages app, updates status to `awaiting_signature`
5. **Slack Notification** → Send custom message to Slack channel

### Customer Flow
1. **Receive Link** → Via SMS/Email
2. **View Proposal** → Customer portal shows quote details
3. **Sign Contract** → Digital signature capture
4. **Pay Deposit** → Stripe payment (50% deposit or full amount)

### Status Progression
```
scheduling_quote → quote_scheduled → awaiting_signature → awaiting_payment → paid → repair_scheduled
```

---

## Recent Updates (April 16, 2026)

### Fixes Applied
- **Form field locking**: Fields now editable for `scheduling_quote` status (was incorrectly locked)
- **PDF View/Share buttons**: Separated into two distinct buttons (no modal)
- **iOS PDF handling**: View PDF downloads directly, Share PDF uses native share sheet
- **Stripe payment modal**: Scrollable with max-height, Link (save info) feature disabled
- **Slack messages**: Custom message text now included in notifications
- **Admin/Sales toggle**: Admin users can switch between dashboard and sales views

### Payout Logic
- **FB Margin**: 25% of total sell price
- **Colt Payout**: 75% of total sell price
- Misc (extra markup above minimum) is split proportionally in the 75/25 ratio

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `components/QuotesList.tsx` | Sales mobile view - quote list |
| `components/dashboard/DashboardView.tsx` | Admin dashboard view |
| `components/CustomerViewActions.tsx` | PDF, Slack, Send Proposal buttons |
| `components/CustomerSection.tsx` | Customer info form (with locking logic) |
| `components/PricingSection.tsx` | Pricing with payout breakdown |
| `components/PaymentModal.tsx` | Stripe payment integration |
| `app/customer/[id]/page.tsx` | Customer portal |
| `app/api/slack/route.ts` | Slack notification API |
| `lib/pdf.ts` | PDF generation with signature embedding |
| `hooks/useUserRole.ts` | Role-based UI rendering |

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Slack
SLACK_BOT_TOKEN=xxx
SLACK_CHANNEL_ID=xxx

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=xxx
STRIPE_SECRET_KEY=xxx
```

---

## Deployment

```bash
# Commit and push
git add -A && git commit -m "message" && git push origin main

# Deploy to production
npx vercel --prod
```

Auto-deploys on push to main if Vercel Git integration is connected.

---

## Future Feature Plan

See **`HANDOFF-feature-enhancements.md`** for detailed implementation specs:

1. **Customers Table** - Separate customer records, editable after quote sent
2. **2-Week Proposal Expiration** - Auto-expire customer portals
3. **Photo Upload** - Attach photos to proposals
4. **SMS via OpenPhone** - Send from Colt's number (replace native SMS)
5. **Gmail Integration** - Send from admin@fenceboys.com
6. **Filtered Dashboard Tabs** - Custom saved views for Colt

### New Environment Variables Needed
```bash
# OpenPhone SMS (Phase 4)
OPENPHONE_API_KEY=xxx
OPENPHONE_PHONE_NUMBER_ID=xxx

# Gmail (Phase 5)
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
GMAIL_REFRESH_TOKEN=xxx
GMAIL_FROM_EMAIL=admin@fenceboys.com
```

---

## Known Behaviors

- **Magic Links**: Expire after 1 hour, single-use. Outlook may pre-fetch and invalidate.
- **Stripe "Save Info"**: Optional checkbox still appears but modal is now scrollable
- **PDF Signatures**: Generated fresh each time using latest quote data from Supabase
- **Form Locking**: Customer info locked after status passes `quote_scheduled`

---

## Support

- **Auth Issues**: Check Supabase redirect URLs include `https://repair.fenceboys.com/auth/callback`
- **Slack Not Sending**: Verify `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` in Vercel env vars
- **Payments Failing**: Check Stripe dashboard for error details
