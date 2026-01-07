import { NextResponse } from 'next/server';

const PRETIUM_NETWORKS: Record<string, Array<{ code: string; name: string; type: string; country: string }>> = {
  MW: [
    { code: 'Airtel Money', name: 'Airtel Money', type: 'mobile_money', country: 'MW' },
    { code: 'TNM Mpamba', name: 'TNM Mpamba', type: 'mobile_money', country: 'MW' },
  ],
  CD: [
    { code: 'Airtel Money', name: 'Airtel Money', type: 'mobile_money', country: 'CD' },
    { code: 'Mpesa', name: 'Mpesa', type: 'mobile_money', country: 'CD' },
    { code: 'Orange Money', name: 'Orange Money', type: 'mobile_money', country: 'CD' },
  ],
  ET: [
    { code: 'Telebirr', name: 'Telebirr', type: 'mobile_money', country: 'ET' },
    { code: 'Cbe Birr', name: 'Cbe Birr', type: 'mobile_money', country: 'ET' },
    { code: 'Mpesa', name: 'Mpesa', type: 'mobile_money', country: 'ET' },
  ],
  KE: [
    { code: 'Safaricom', name: 'Safaricom', type: 'mobile_money', country: 'KE' },
    { code: 'Airtel', name: 'Airtel', type: 'mobile_money', country: 'KE' },
  ],
  GH: [
    { code: 'MTN MoMo', name: 'MTN MoMo', type: 'mobile_money', country: 'GH' },
    { code: 'AirtelTigo Money', name: 'AirtelTigo Money', type: 'mobile_money', country: 'GH' },
    { code: 'Telecel Cash', name: 'Telecel Cash', type: 'mobile_money', country: 'GH' },
  ],
  UG: [
    { code: 'MTN', name: 'MTN', type: 'mobile_money', country: 'UG' },
    { code: 'Airtel', name: 'Airtel', type: 'mobile_money', country: 'UG' },
  ],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');

  if (!country) {
    return NextResponse.json({
      statusCode: 400,
      message: 'Country code is required',
    }, { status: 400 });
  }

  const networks = PRETIUM_NETWORKS[country.toUpperCase()] || [];
  
  return NextResponse.json({
    statusCode: 200,
    data: networks,
  });
}
