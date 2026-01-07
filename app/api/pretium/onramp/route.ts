import { NextResponse } from 'next/server';

const BASE_URL = process.env.PRETIUM_BASE_URL || 'https://api.xwift.africa';
const API_KEY = process.env.PRETIUM_API_KEY || '';
const WEBHOOK_BASE_URL = process.env.NEXT_PUBLIC_URL || 'https://nedapayminiapp.vercel.app';

function calculateFee(amount: number): string {
  const fee = amount * 0.005;
  const clamped = Math.max(0.01, fee);
  return clamped.toFixed(2);
}

function normalizeMobileNetwork(countryCode: string | undefined, mobileNetwork: string | undefined): string {
  const raw = String(mobileNetwork || '').trim();
  const upper = raw.toUpperCase();
  const cc = String(countryCode || '').toUpperCase();

  if (cc === 'KE') {
    if (upper === 'MPESA' || upper === 'M-PESA' || upper === 'M_PESA') return 'Safaricom';
    if (upper === 'SAFARICOM') return 'Safaricom';
    if (upper === 'AIRTEL' || upper === 'AIRTELMONEY' || upper === 'AIRTEL_MONEY') return 'Airtel';
  }

  if (cc === 'GH') {
    if (upper === 'MTN') return 'MTN MoMo';
    if (upper === 'MTN MOMO' || upper === 'MTN_MOMO') return 'MTN MoMo';
    if (upper === 'AIRTELTIGO') return 'AirtelTigo Money';
    if (upper === 'TELECEL') return 'Telecel Cash';
  }

  if (cc === 'UG') {
    if (upper === 'MTN' || upper === 'MTN MOMO' || upper === 'MTN_MOMO') return 'MTN';
    if (upper === 'AIRTEL' || upper === 'AIRTELMONEY' || upper === 'AIRTEL_MONEY') return 'Airtel';
  }

  return raw;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      currency_code, 
      shortcode, 
      amount, 
      mobile_network, 
      chain, 
      asset, 
      address, 
      callback_url 
    } = body;

    if (!currency_code || !shortcode || !amount || !mobile_network || !address) {
      return NextResponse.json({
        statusCode: 400,
        message: 'Missing required fields',
      }, { status: 400 });
    }

    const countryCode =
      currency_code === 'KES' ? 'KE' :
      currency_code === 'MWK' ? 'MW' :
      currency_code === 'CDF' ? 'CD' :
      currency_code === 'ETB' ? 'ET' :
      currency_code === 'GHS' ? 'GH' :
      currency_code === 'UGX' ? 'UG' : undefined;

    const pretiumBody = {
      shortcode,
      amount,
      mobile_network: normalizeMobileNetwork(countryCode, mobile_network),
      chain: chain || 'BASE',
      asset,
      address,
      fee: calculateFee(Number(amount)),
      callback_url: callback_url || `${WEBHOOK_BASE_URL}/api/webhook/pretium`,
    };

    const response = await fetch(`${BASE_URL}/v1/onramp/${currency_code}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(pretiumBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        statusCode: response.status,
        message: data.message || 'Failed to initiate onramp',
        error: data.error,
      }, { status: response.status });
    }

    return NextResponse.json({
      statusCode: 200,
      data: data.data || data,
    });
  } catch (error: any) {
    console.error('Onramp error:', error);
    return NextResponse.json({
      statusCode: 500,
      message: 'Internal server error',
      error: error.message,
    }, { status: 500 });
  }
}
