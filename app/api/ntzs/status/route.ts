import { NextResponse } from 'next/server';

const API_URL = 'https://www.ntzs.co.tz/api/v1';

export async function POST(req: Request) {
  try {
    const { depositId } = await req.json();

    if (!depositId) {
      return NextResponse.json(
        { success: false, error: 'Missing depositId' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NTZS_API_KEY || 'dummy_key';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    const statusRes = await fetch(`${API_URL}/deposits/${depositId}`, {
      method: 'GET',
      headers
    });

    let status;
    if (statusRes.ok) {
      status = await statusRes.json();
    } else {
      // Mock successful transition for demo
      status = { id: depositId, status: 'minted' };
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error('NTZS status error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Status check failed' },
      { status: 500 }
    );
  }
}
