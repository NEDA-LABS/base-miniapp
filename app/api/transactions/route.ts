import { NextRequest, NextResponse } from 'next/server';

// Interfaces for External API Response
interface ExternalTransaction {
  id: string;
  createdAt: string;
  merchantId: string;
  status: string;
  amount: string;
  rate: string;
  currency: string;
  accountName: string;
  accountNumber: string;
  institution: string;
}

interface ExternalApiResponse {
  success: boolean;
  data: {
    transactions: ExternalTransaction[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  };
}

// GET: Fetch transactions - by id, merchantId, or txHash
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('id');
    const merchantId = searchParams.get('merchantId');
    const txHash = searchParams.get('txHash');

    const API_BASE_URL = 'https://api.nedapay.xyz/api/v1/ramp/paycrest/transactions';
    const API_KEY = process.env.NEDAPAY_API_KEY || '';

    // Helper for headers
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    };

    // Fetch single transaction by ID from External API
    if (transactionId) {
      const res = await fetch(`${API_BASE_URL}/${transactionId}`, {
        headers,
        cache: 'no-store'
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          return NextResponse.json(
            { error: 'Transaction not found' },
            { status: 404 }
          );
        }
        throw new Error(`External API error: ${res.status} ${res.statusText}`);
      }

      const transaction = await res.json();
      return NextResponse.json(transaction);
    }

    

    // Fetch all transactions for a merchant from External API
    if (merchantId) {
      const res = await fetch(`${API_BASE_URL}?wallet=${merchantId}`, {
        headers,
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`External API error: ${res.status} ${res.statusText}`);
      }

      const responseData: ExternalApiResponse = await res.json();
      const transactions = responseData.data.transactions;
      console.log(`📊 Fetched ${transactions.length} transactions for merchantId: ${merchantId} from API`);

      // Calculate stats to match /api/sync-transactions payload structure
      const totalVolume = transactions.reduce((sum: number, tx: any) => sum + (parseFloat(tx.amount) || 0), 0);
      
      const completedCount = transactions.filter((tx: any) => {
        const status = (tx.status || '').toLowerCase();
        return status === 'completed' || status === 'success' || status === 'settled';
      }).length;
      
      const pendingCount = transactions.filter((tx: any) => {
        const status = (tx.status || '').toLowerCase();
        return status === 'pending';
      }).length;
      
      const failedCount = transactions.filter((tx: any) => {
        const status = (tx.status || '').toLowerCase();
        return status === 'failed' || status === 'refunded' || status === 'expired';
      }).length;

      return NextResponse.json({
        transactions,
        stats: {
          totalVolume,
          totalCount: transactions.length,
          completedCount,
          pendingCount,
          failedCount
        }
      });
    }

    // No valid query params provided
    return NextResponse.json(
      { error: 'Please provide id, txHash, or merchantId parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching transaction(s):', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction(s)' },
      { status: 500 }
    );
  }
}



