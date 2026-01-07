import { NextResponse } from 'next/server';

const BASE_URL = process.env.PRETIUM_BASE_URL || 'https://api.xwift.africa';
const API_KEY = process.env.PRETIUM_API_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currency_code, transaction_code } = body;

    if (!currency_code || !transaction_code) {
      return NextResponse.json({
        statusCode: 400,
        message: 'Currency code and transaction code are required',
      }, { status: 400 });
    }

    const response = await fetch(`${BASE_URL}/v1/status/${currency_code}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ transaction_code }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        statusCode: response.status,
        message: data.message || 'Failed to fetch status',
        error: data.error,
      }, { status: response.status });
    }

    return NextResponse.json({
      statusCode: 200,
      data: data.data || data,
    });
  } catch (error: any) {
    console.error('Status error:', error);
    return NextResponse.json({
      statusCode: 500,
      message: 'Internal server error',
      error: error.message,
    }, { status: 500 });
  }
}
