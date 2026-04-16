# Fence Boys Repair Tool - Feature Enhancement Handoff

**Created:** April 11, 2026
**Project:** fence-boys-repair-tool
**Status:** Planning Complete - Ready for Implementation

---

## Executive Summary

Six features to enhance the Fence Boys Repair Tool quoting system:

1. **Customers Table** - Separate customer records from quotes, enable editing after quote is sent
2. **2-Week Proposal Expiration** - Auto-expire proposals in customer portal
3. **Photo Upload** - Allow Colt to attach photos to proposals
4. **SMS via OpenPhone** - Send portal links via text from Colt's number
5. **Gmail Integration** - Send portal links via email from admin@fenceboys.com
6. **Filtered Dashboard Tabs** - Custom views for Colt's workflow

---

## Current Architecture Context

### Tech Stack
- **Framework:** Next.js 14 (App Router) with React 19
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (bucket: `pdfs`)
- **Auth:** Supabase Auth
- **Styling:** Tailwind CSS
- **Payments:** Stripe
- **Notifications:** Slack (implemented), SMS/Email (placeholder)

### Key Existing Patterns

**File Upload (reference for photo upload):**
- `app/api/upload-pdf/route.ts` - Uses Supabase service role key
- Pattern: FormData → Uint8Array buffer → Supabase Storage upload

**Notifications (reference for SMS/Email):**
- `lib/slackNotifications.ts` - Template-based notifications with merge tags
- `lib/adminConfig.ts` - `replaceMergeTags()` function for template processing
- Templates stored in `notification_templates` table

**Customer Data (current state):**
- Stored directly on `repair_quotes` table (client_name, phone, email, address, city_state, zip)
- Editing locked after quote leaves draft/quote_scheduled status
- No separate customers table

**Dashboard Views (existing infrastructure):**
- `dashboard_views` table exists with `columns` and `filters` JSONB fields
- `useDashboardViews` hook exists but filters NOT applied to queries
- Currently only status-based filtering via stat cards

---

## Phase 1: Customers Table

### Why
- Customer info locked after quote sent - cannot correct typos or update contact info
- No way to track returning customers across multiple quotes
- Cielo will fill quote before form exists, needs way to add/edit customer later

### Database Migration

```sql
-- Create customers table
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  client_name text NOT NULL,
  phone text,
  email text,
  address text,
  city_state text,
  zip text,
  notes text,
  UNIQUE(phone),
  UNIQUE(email)
);

CREATE INDEX customers_phone_idx ON customers(phone);
CREATE INDEX customers_email_idx ON customers(email);
CREATE INDEX customers_name_idx ON customers(client_name);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS (following existing pattern for admin tables)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Add customer_id to repair_quotes
ALTER TABLE repair_quotes ADD COLUMN customer_id uuid REFERENCES customers(id);
CREATE INDEX repair_quotes_customer_id_idx ON repair_quotes(customer_id);
```

### Data Migration (populate from existing quotes)

```sql
-- Insert unique customers from existing quotes (dedup by phone)
INSERT INTO customers (client_name, phone, email, address, city_state, zip)
SELECT DISTINCT ON (COALESCE(phone, email, client_name))
  client_name, phone, email, address, city_state, zip
FROM repair_quotes
WHERE client_name IS NOT NULL AND client_name != ''
ON CONFLICT DO NOTHING;

-- Link quotes to customer records
UPDATE repair_quotes rq
SET customer_id = c.id
FROM customers c
WHERE rq.phone IS NOT NULL
  AND rq.phone != ''
  AND rq.phone = c.phone;
```

### Files to Create

**`types/customer.ts`**
```typescript
export interface Customer {
  id: string;
  created_at: string;
  updated_at: string;
  client_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city_state: string | null;
  zip: string | null;
  notes: string | null;
}
```

**`hooks/useCustomer.ts`** - Single customer CRUD
**`hooks/useCustomers.ts`** - Customer list with search
**`components/CustomerSelectModal.tsx`** - Search/select or create customer

### Files to Modify

**`types/quote.ts`** - Add `customer_id?: string` to RepairQuote interface

**`components/CustomerSection.tsx`**
- Add "Link Customer" button when customer_id is null
- When linked, edits update `customers` table (not locked by quote status)
- Show customer lookup modal

**`hooks/useQuote.ts`** - Add `linkCustomer(customerId)` function

---

## Phase 2: 2-Week Proposal Expiration

### Why
- Proposals stay open indefinitely - no urgency for customers
- Manual portal closure is tedious
- Standard business practice to have quote validity period

### Database Migration

```sql
ALTER TABLE repair_quotes
ADD COLUMN expiration_date timestamp with time zone,
ADD COLUMN expired_at timestamp with time zone;

CREATE INDEX repair_quotes_expiration_idx ON repair_quotes(expiration_date)
WHERE expiration_date IS NOT NULL AND expired_at IS NULL;
```

### Files to Create

**`lib/expirationService.ts`**
```typescript
export function setExpiration(quoteId: string, days: number = 14): Date {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + days);
  return expiration;
}

export function isExpired(expirationDate: string | null): boolean {
  if (!expirationDate) return false;
  return new Date(expirationDate) < new Date();
}

export function getDaysUntilExpiration(expirationDate: string | null): number | null {
  if (!expirationDate) return null;
  const diff = new Date(expirationDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
```

**`app/api/check-expirations/route.ts`** - Cron endpoint
```typescript
// Called by Vercel Cron or external scheduler
// Marks quotes as expired and closes portals
export async function GET() {
  const { data, error } = await supabase
    .from('repair_quotes')
    .update({
      expired_at: new Date().toISOString(),
      portal_closed: true
    })
    .lt('expiration_date', new Date().toISOString())
    .is('expired_at', null)
    .in('status', ['awaiting_signature', 'awaiting_payment']);

  return NextResponse.json({ expired: data?.length || 0 });
}
```

### Files to Modify

**`types/quote.ts`** - Add `expiration_date` and `expired_at` fields

**`app/customer/[id]/page.tsx`**
- Check expiration on load
- If expired: show "Quote Expired" message with contact info
- If within 3 days: show warning banner

**`components/SendProposalModal.tsx`**
- Auto-set `expiration_date` to 14 days when sending

**`components/dashboard/QuotesTable.tsx`**
- Show expiration indicator (optional)

---

## Phase 3: Photo Upload

### Why
- Colt takes photos of repair areas but can't attach to proposals
- Customers want to see what's being quoted
- Visual reference reduces disputes

### Supabase Storage Setup
- Create bucket: `quote-photos`
- Set public access or use signed URLs

### Database Migration

```sql
CREATE TABLE quote_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  quote_id uuid NOT NULL REFERENCES repair_quotes(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  filename text NOT NULL,
  file_size integer,
  mime_type text,
  caption text,
  sort_order integer DEFAULT 0
);

CREATE INDEX quote_photos_quote_id_idx ON quote_photos(quote_id);
ALTER TABLE quote_photos DISABLE ROW LEVEL SECURITY;
```

### Files to Create

**`types/photo.ts`**
```typescript
export interface QuotePhoto {
  id: string;
  created_at: string;
  quote_id: string;
  storage_path: string;
  public_url: string;
  filename: string;
  file_size: number | null;
  mime_type: string | null;
  caption: string | null;
  sort_order: number;
}
```

**`hooks/useQuotePhotos.ts`** - CRUD for quote photos

**`components/PhotoUploader.tsx`** - Drag-drop upload with preview

**`components/PhotoGallery.tsx`** - Grid display with lightbox

**`app/api/upload-photo/route.ts`** - Server upload handler
```typescript
// Follow pattern from app/api/upload-pdf/route.ts
// Upload to 'quote-photos' bucket
// Insert record into quote_photos table
// Return public URL
```

### Files to Modify

**`components/QuoteEditor.tsx`** - Add photo section between customer and pricing

**`app/customer/[id]/page.tsx`** - Display photos read-only in portal

---

## Phase 4: SMS via OpenPhone

### Why
- "Coming Soon" in SendProposalModal needs activation
- Colt already uses OpenPhone - texts should come from his number
- Customers more likely to open text than email

### OpenPhone API Setup
1. Log into OpenPhone dashboard
2. Go to Settings > API
3. Generate API key
4. Find Colt's phone number ID

### Environment Variables
```
OPENPHONE_API_KEY=xxx
OPENPHONE_PHONE_NUMBER_ID=xxx
```

### Files to Create

**`lib/smsService.ts`**
```typescript
import { replaceMergeTags } from './adminConfig';

export async function sendSMS(to: string, message: string): Promise<boolean> {
  const response = await fetch('/api/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message }),
  });
  return response.ok;
}

export async function sendProposalSMS(quote: RepairQuote): Promise<boolean> {
  // Fetch SMS template from notification_templates
  // Replace merge tags including {{portal_link}}
  // Call sendSMS
}
```

**`app/api/send-sms/route.ts`**
```typescript
export async function POST(request: NextRequest) {
  const { to, message } = await request.json();

  // OpenPhone API
  const response = await fetch('https://api.openphone.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENPHONE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.OPENPHONE_PHONE_NUMBER_ID,
      to: [to],
      content: message,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

### Files to Modify

**`components/SendProposalModal.tsx`**
- Remove "Coming Soon" badge from SMS option
- Enable SMS checkbox
- On send: call SMS API if checked

**`components/admin/NotificationTemplateEditor.tsx`**
- Add SMS template editing (sms_enabled toggle, sms_template textarea)

### Default SMS Template
```
Hi {{customer_name}}! Your Fence Boys repair quote is ready. View and sign here: {{portal_link}}
```

---

## Phase 5: Gmail Integration

### Why
- Email is standard business communication
- Some customers prefer email over text
- Creates paper trail

### Google Cloud Setup (One-Time)
1. Create project in Google Cloud Console
2. Enable Gmail API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `https://repair.fenceboys.com/api/auth/gmail/callback`
5. Complete OAuth flow to get refresh token

### Environment Variables
```
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
GMAIL_REFRESH_TOKEN=xxx
GMAIL_FROM_EMAIL=admin@fenceboys.com
```

### Package to Install
```bash
npm install googleapis
```

### Files to Create

**`lib/gmailService.ts`**
```typescript
import { google } from 'googleapis';

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Create RFC 2822 email
  const message = [
    `To: ${to}`,
    `From: ${process.env.GMAIL_FROM_EMAIL}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
  ].join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage }
  });

  return true;
}
```

**`lib/emailTemplates.ts`** - HTML email template generation

**`app/api/send-email/route.ts`** - Email sending endpoint

**`app/api/auth/gmail/callback/route.ts`** - OAuth callback (for initial setup)

### Files to Modify

**`components/SendProposalModal.tsx`**
- Remove "Coming Soon" from Email option
- Enable Email checkbox
- On send: call email API if checked

**`components/admin/NotificationTemplateEditor.tsx`**
- Add email subject and body editing

---

## Phase 6: Filtered Dashboard Tabs

### Why
- Colt needs quick access to specific quote groups
- Current 7 stat cards are useful but not customizable
- dashboard_views infrastructure exists but isn't activated

### No Database Changes
The `dashboard_views` table already exists with proper schema.

### Files to Create

**`components/dashboard/ViewTabs.tsx`**
```typescript
interface ViewTabsProps {
  views: DashboardView[];
  activeViewId: string;
  onViewChange: (viewId: string) => void;
}

export function ViewTabs({ views, activeViewId, onViewChange }: ViewTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            view.id === activeViewId
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {view.name}
        </button>
      ))}
    </div>
  );
}
```

### Files to Modify

**`hooks/useQuotesList.ts`** - Accept and apply filters
```typescript
export function useQuotesList(filters?: DashboardFilter[]) {
  const fetchQuotes = useCallback(async () => {
    let query = supabase.from('repair_quotes').select('*');

    // Apply view filters
    if (filters && filters.length > 0) {
      filters.forEach((filter) => {
        switch (filter.operator) {
          case 'equals':
            query = query.eq(filter.field, filter.value);
            break;
          case 'not_equals':
            query = query.neq(filter.field, filter.value);
            break;
          case 'contains':
            query = query.ilike(filter.field, `%${filter.value}%`);
            break;
          case 'greater_than':
            query = query.gt(filter.field, filter.value);
            break;
          case 'less_than':
            query = query.lt(filter.field, filter.value);
            break;
        }
      });
    }

    // ... rest of existing logic
  }, [filters, searchQuery]);
}
```

**`components/dashboard/DashboardView.tsx`**
- Import and use ViewTabs
- Track activeViewId state
- Pass active view's filters to useQuotesList
- Optionally pass columns to QuotesTable

**`components/dashboard/QuotesTable.tsx`**
- Accept optional columns prop
- Only render visible columns

### Pre-configured Views to Seed
```sql
INSERT INTO dashboard_views (name, sort_order, is_default, filters, columns) VALUES
('All Quotes', 1, true, '[]', '[...]'),
('Needs Follow-up', 2, false, '[{"field":"status","operator":"equals","value":"awaiting_signature"}]', '[...]'),
('Ready to Schedule', 3, false, '[{"field":"status","operator":"equals","value":"paid"}]', '[...]'),
('This Week', 4, false, '[{"field":"scheduled_date","operator":"greater_than","value":"NOW()"}]', '[...]');
```

---

## Implementation Order

```
Week 1:
├── Phase 1: Customers Table
│   └── Migration → Types → Hooks → CustomerSelectModal → CustomerSection updates
└── Phase 2: Proposal Expiration
    └── Migration → Types → expirationService → Portal checks → SendProposalModal

Week 2:
├── Phase 3: Photo Upload
│   └── Supabase bucket → Migration → Types → Hooks → PhotoUploader → PhotoGallery → QuoteEditor
└── Phase 4: SMS (OpenPhone)
    └── Environment vars → smsService → API route → SendProposalModal → Admin template UI

Week 3:
├── Phase 5: Gmail Integration
│   └── Google Cloud setup → googleapis package → gmailService → API route → SendProposalModal
└── Phase 6: Dashboard Tabs
    └── ViewTabs component → useQuotesList filter support → DashboardView integration
```

---

## Environment Variables Summary

```bash
# Existing
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SLACK_BOT_TOKEN=xxx
SLACK_CHANNEL_ID=xxx
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx

# New - OpenPhone SMS
OPENPHONE_API_KEY=xxx
OPENPHONE_PHONE_NUMBER_ID=xxx

# New - Gmail
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
GMAIL_REFRESH_TOKEN=xxx
GMAIL_FROM_EMAIL=admin@fenceboys.com
```

---

## Testing Checklist

- [ ] **Customers**: Create customer → Link to quote → Edit customer after quote sent
- [ ] **Expiration**: Send proposal → Check portal shows expiration → Wait/simulate expiry → Verify blocked
- [ ] **Photos**: Upload photo → View in editor → View in customer portal → Delete photo
- [ ] **SMS**: Send proposal with SMS checked → Verify text received from Colt's number
- [ ] **Email**: Send proposal with Email checked → Verify email from admin@fenceboys.com
- [ ] **Dashboard**: Create custom view → Apply filters → Verify quotes filtered correctly

---

## Questions for Colt/Team

1. What specific dashboard views does Colt want pre-configured?
2. Should photos be included in the PDF contract?
3. What should the email template look like (branded HTML or simple text)?
4. Should expiration be configurable per-quote or always 14 days?
5. Any specific merge tags needed beyond the existing ones?
