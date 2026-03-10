import { NextRequest, NextResponse } from 'next/server';

const NEDAPAY_API_BASE = process.env.NEXT_PUBLIC_NEDAPAY_API_BASE || 'https://api.nedapay.xyz';
const NEDAPAY_API_KEY = process.env.NEXT_PUBLIC_NEDAPAY_API_KEY;

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        if (!NEDAPAY_API_KEY) {
            return NextResponse.json({ error: 'API key missing' }, { status: 500 });
        }

        const pathStr = params.path.join('/');
        const searchParams = request.nextUrl.search;
        const targetUrl = `${NEDAPAY_API_BASE}/api/v1/ramp/rampa/${pathStr}${searchParams}`;

        console.log(`[Rampa Proxy] GET ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'x-api-key': NEDAPAY_API_KEY,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[Rampa Proxy] Error in GET:', error);
        return NextResponse.json(
            { error: 'Failed to proxy request', message: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        if (!NEDAPAY_API_KEY) {
            return NextResponse.json({ error: 'API key missing' }, { status: 500 });
        }

        const pathStr = params.path.join('/');
        const searchParams = request.nextUrl.search;
        const targetUrl = `${NEDAPAY_API_BASE}/api/v1/ramp/rampa/${pathStr}${searchParams}`;

        console.log(`[Rampa Proxy] POST ${targetUrl}`);

        const body = await request.json();

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'x-api-key': NEDAPAY_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[Rampa Proxy] Error in POST:', error);
        return NextResponse.json(
            { error: 'Failed to proxy request', message: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
