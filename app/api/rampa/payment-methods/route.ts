/**
 * Explicit route for GET /api/rampa/payment-methods - proxies to backend.
 * Ensures the request is always seen and logged.
 */
import { NextResponse } from 'next/server';

const NEDAPAY_API_BASE = process.env.NEXT_PUBLIC_NEDAPAY_API_BASE || process.env.NEDAPAY_API_BASE || 'https://api.nedapay.xyz';
const NEDAPAY_API_KEY = process.env.NEXT_PUBLIC_NEDAPAY_API_KEY || process.env.NEDAPAY_API_KEY;
const FETCH_TIMEOUT_MS = 25000;

export async function GET() {
    const start = Date.now();
    console.log('[Rampa Proxy] >>> GET /api/rampa/payment-methods (request received)');

    try {
        if (!NEDAPAY_API_KEY) {
            console.error('[Rampa Proxy] payment-methods: API key missing');
            return NextResponse.json({ error: 'API key missing' }, { status: 500 });
        }

        const targetUrl = `${NEDAPAY_API_BASE}/api/v1/ramp/rampa/payment-methods`;
        console.log('[Rampa Proxy] fetching backend:', targetUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'x-api-key': NEDAPAY_API_KEY,
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const text = await response.text();
        const elapsed = Date.now() - start;
        const trimmed = text?.trim() ?? '';
        const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');

        let data: unknown;
        if (looksLikeJson) {
            try {
                data = JSON.parse(text);
            } catch {
                data = { error: 'Backend returned invalid JSON', response: text.slice(0, 200) };
            }
        } else {
            data = { error: 'Backend returned non-JSON', response: text.slice(0, 200) };
        }

        const status = (looksLikeJson && typeof data === 'object' && data !== null && !('error' in data))
            ? response.status
            : (response.ok ? 502 : response.status);

        if (status >= 400) {
            console.error(`[Rampa Proxy] payment-methods → ${response.status} in ${elapsed}ms`, text.slice(0, 150));
        } else {
            const preview = typeof data === 'object' && data !== null ? JSON.stringify(data).slice(0, 100) : '';
            console.log(`[Rampa Proxy] payment-methods → ${status} in ${elapsed}ms`, preview);
        }
        return NextResponse.json(data, { status });
    } catch (error) {
        const elapsed = Date.now() - start;
        console.error(`[Rampa Proxy] payment-methods error in ${elapsed}ms:`, error);
        return NextResponse.json(
            { error: 'Failed to proxy request', message: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
