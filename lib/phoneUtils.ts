// Shared phone utilities. Used for dedup lookups, display formatting, and
// rendering Slack mrkdwn tel: links. Previously lived as a private helper in
// app/api/slack/route.ts; extracted so Customer creation can use the same
// normalization rule and phone comparisons stay consistent across the app.

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return null;
}

export function formatPhoneDisplay(raw: string | null | undefined): string {
  const digits = normalizePhone(raw);
  if (!digits) return raw?.trim() ?? '';
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Progressive "as you type" formatter for phone inputs. Strips non-digits,
// caps at 10, and returns a partial "(XXX) XXX-XXXX" string matching however
// many digits the user has entered so far.
export function formatPhoneInput(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// E.164-format a US/CA phone for SMS APIs (Quo/OpenPhone expects +1XXXXXXXXXX).
export function toE164(raw: string | null | undefined): string | null {
  const digits = normalizePhone(raw);
  return digits ? `+1${digits}` : null;
}

export function formatPhoneForSlackLink(raw: string | null | undefined): string {
  if (!raw) return 'N/A';
  // Unwrap any existing `<tel:...|DISPLAY>` Slack link syntax already in the DB
  const unwrapped = raw.replace(/<tel:[^|>]*\|?([^>]*)>/g, '$1').trim();
  const digits = normalizePhone(unwrapped);
  if (digits) {
    const display = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `<tel:+1${digits}|${display}>`;
  }
  return unwrapped || 'N/A';
}
