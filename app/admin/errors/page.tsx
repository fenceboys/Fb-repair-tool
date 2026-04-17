'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

interface ClientErrorRow {
  id: string;
  created_at: string;
  quote_id: string | null;
  source: string | null;
  error_branch: string | null;
  http_status: number | null;
  user_agent: string | null;
  connection_type: string | null;
  save_data: boolean | null;
  raw_name: string | null;
  raw_message: string | null;
  request_id: string | null;
}

const BRANCH_LABELS: Record<string, string> = {
  fetch_timeout: 'Timed out',
  non_ok_response: 'Server error',
  no_client_secret: 'Empty response',
  api_error_response: 'API error',
  fetch_reject: 'Fetch rejected',
  fetch_reject_unknown: 'Fetch rejected (unknown)',
  elements_mount: 'Stripe mount failed',
  elements_render: 'Stripe render crashed',
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function truncate(value: string | null, max: number): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export default function ErrorsPage() {
  const [rows, setRows] = useState<ClientErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('client_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setRows((data ?? []) as ClientErrorRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const branches = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => {
      if (r.error_branch) set.add(r.error_branch);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (branchFilter === 'all') return rows;
    return rows.filter(r => r.error_branch === branchFilter);
  }, [rows, branchFilter]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Payment Errors</h2>
          <p className="text-sm text-gray-500 mt-1">
            Last 100 client-side payment failures. Newest first. Click a row to see the raw payload.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="branch-filter" className="text-gray-600">
                Filter:
              </label>
              <select
                id="branch-filter"
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
              >
                <option value="all">All ({rows.length})</option>
                {branches.map(b => (
                  <option key={b} value={b}>
                    {BRANCH_LABELS[b] ?? b} ({rows.filter(r => r.error_branch === b).length})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${filtered.length} shown`}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-sm text-red-700">
              Error loading: {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <p className="text-sm">No payment errors recorded.</p>
              <p className="text-xs mt-1">That is a good thing.</p>
            </div>
          )}

          {filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Branch</th>
                  <th className="px-4 py-2 font-medium">HTTP</th>
                  <th className="px-4 py-2 font-medium">Network</th>
                  <th className="px-4 py-2 font-medium">Quote</th>
                  <th className="px-4 py-2 font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const isExpanded = expandedId === row.id;
                  return (
                    <>
                      <tr
                        key={row.id}
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {formatTimestamp(row.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 px-2 py-0.5 text-xs font-medium">
                            {BRANCH_LABELS[row.error_branch ?? ''] ?? row.error_branch ?? 'unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.http_status ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.connection_type ?? '—'}
                          {row.save_data ? ' (low data)' : ''}
                        </td>
                        <td className="px-4 py-3">
                          {row.quote_id ? (
                            <Link
                              href={`/customer/${row.quote_id}?internal=true`}
                              onClick={e => e.stopPropagation()}
                              className="text-blue-600 hover:underline font-mono text-xs"
                            >
                              {row.quote_id.slice(0, 8)}…
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-md">
                          <span className="block truncate" title={row.raw_message ?? ''}>
                            {truncate(row.raw_message, 80) || '—'}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${row.id}-details`} className="bg-gray-50 border-t border-gray-100">
                          <td colSpan={6} className="px-4 py-3 text-xs text-gray-700">
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
                              <dt className="font-semibold">User agent</dt>
                              <dd className="break-all">{row.user_agent ?? '—'}</dd>
                              <dt className="font-semibold">Error name</dt>
                              <dd>{row.raw_name ?? '—'}</dd>
                              <dt className="font-semibold">Full message</dt>
                              <dd className="break-all whitespace-pre-wrap">{row.raw_message ?? '—'}</dd>
                              <dt className="font-semibold">Request ID</dt>
                              <dd className="font-mono">{row.request_id ?? '—'}</dd>
                              <dt className="font-semibold">Source</dt>
                              <dd>{row.source ?? '—'}</dd>
                            </dl>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
