import { NextResponse } from 'next/server';



export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    if (!wallet) {
      return NextResponse.json(
        { status: 'error', message: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // TODO: Connect to dedicated backend
    // Find user by wallet address
    const user = { wallet }; // Mock user

    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch offramp transactions for the user's merchantId with all fields
    const transactions: any[] = []; // Mock empty transactions

    // Count total transactions for pagination
    const total = 0;

    return NextResponse.json({
      status: 'success',
      data: {
        transactions,
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Error fetching offramp transactions:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}