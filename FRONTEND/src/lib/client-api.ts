/** One call to the school's own API from a page: the answer's data, or the plain reason it failed. */
export async function callApi<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<{ ok: true; data: T; message?: string } | { ok: false; message: string }> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return { ok: false, message: json?.message || json?.error || 'Something went wrong. Try again.' };
    return { ok: true, data: json.data as T, message: json.message };
  } catch {
    return { ok: false, message: 'Could not reach the school. Check your connection and try again.' };
  }
}

export const naira = (n: number | null | undefined) => (n == null ? '—' : `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`);

export const lagosStamp = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';
