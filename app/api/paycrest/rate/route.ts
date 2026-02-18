import { NextRequest, NextResponse } from 'next/server';
import { fetchTokenRate } from '@/utils/paycrest';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const token = searchParams.get('token') as 'USDC' | 'USDT' | 'cUSD' | null;
    const amount = searchParams.get('amount');
    const fiat = searchParams.get('fiat');
    const providerId = searchParams.get('providerId') || undefined;

    if (!token || !amount || !fiat) {
      return NextResponse.json(
        { error: 'Missing required parameters: token, amount, fiat' },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    console.log(`Fetching rate for ${token} -> ${fiat}, amount: ${amountNum}`);
    const rate = await fetchTokenRate(token, amountNum, fiat, providerId);
    
    return NextResponse.json({ rate });
  } catch (error) {
    console.error('Error fetching rate:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch exchange rate',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
