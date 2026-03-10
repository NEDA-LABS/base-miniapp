import { NextRequest, NextResponse } from 'next/server';

const NEDAPAY_API_BASE = process.env.NEXT_PUBLIC_NEDAPAY_API_BASE || process.env.NEDAPAY_API_BASE || 'https://api.nedapay.xyz';
const NEDAPAY_API_KEY = process.env.NEXT_PUBLIC_NEDAPAY_API_KEY || process.env.NEDAPAY_API_KEY;

const FETCH_TIMEOUT_MS = 25000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const start = Date.now();
    const { path } = await params;
    const pathStr = path.join('/');
    // Log immediately so you always see the request in the terminal
    console.log(`[Rampa Proxy] >>> GET /api/rampa/${pathStr} (request received)`);

    try {
        if (!NEDAPAY_API_KEY) {
            console.error('[Rampa Proxy] GET failed: API key missing');
            return NextResponse.json({ error: 'API key missing' }, { status: 500 });
        }

        const searchParams = request.nextUrl.search;
        const targetUrl = `${NEDAPAY_API_BASE}/api/v1/ramp/rampa/${pathStr}${searchParams}`;

        console.log(`[Rampa Proxy] GET fetching backend: ${targetUrl}`);

        const response = await fetchWithTimeout(targetUrl, {
            method: 'GET',
            headers: {
                'x-api-key': NEDAPAY_API_KEY,
                'Content-Type': 'application/json',
            },
        });

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
            console.error(`[Rampa Proxy] GET ${pathStr} → ${response.status} in ${elapsed}ms`, text.slice(0, 150));
        } else {
            const preview = typeof data === 'object' && data !== null ? JSON.stringify(data).slice(0, 80) : String(data).slice(0, 80);
            console.log(`[Rampa Proxy] GET ${pathStr} → ${status} in ${elapsed}ms`, preview);
        }
        return NextResponse.json(data, { status });
    } catch (error) {
        const elapsed = Date.now() - start;
        console.error(`[Rampa Proxy] GET error in ${elapsed}ms:`, error);
        return NextResponse.json(
            { error: 'Failed to proxy request', message: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const start = Date.now();
    const { path } = await params;
    const pathStr = path.join('/');
    console.log(`[Rampa Proxy] >>> POST /api/rampa/${pathStr} (request received)`);

    try {
        if (!NEDAPAY_API_KEY) {
            console.error('[Rampa Proxy] POST failed: API key missing');
            return NextResponse.json({ error: 'API key missing' }, { status: 500 });
        }

        const searchParams = request.nextUrl.search;
        const targetUrl = `${NEDAPAY_API_BASE}/api/v1/ramp/rampa/${pathStr}${searchParams}`;

        console.log(`[Rampa Proxy] POST fetching backend: ${targetUrl}`);

        const body = await request.json();

        const response = await fetchWithTimeout(targetUrl, {
            method: 'POST',
            headers: {
                'x-api-key': NEDAPAY_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

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
            console.error(`[Rampa Proxy] POST ${pathStr} → ${response.status} in ${elapsed}ms`, text.slice(0, 150));
        } else {
            const preview = typeof data === 'object' && data !== null ? JSON.stringify(data).slice(0, 80) : String(data).slice(0, 80);
            console.log(`[Rampa Proxy] POST ${pathStr} → ${status} in ${elapsed}ms`, preview);
        }
        return NextResponse.json(data, { status });
    } catch (error) {
        const elapsed = Date.now() - start;
        console.error(`[Rampa Proxy] POST error in ${elapsed}ms:`, error);
        return NextResponse.json(
            { error: 'Failed to proxy request', message: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
