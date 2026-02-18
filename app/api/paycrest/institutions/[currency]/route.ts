import { NextRequest, NextResponse } from 'next/server';
import { fetchSupportedInstitutions } from '@/utils/paycrest';

export async function GET(
  request: NextRequest,
  { params }: { params: { currency: string } }
) {
  try {
    const { currency } = params;
    
    if (!currency) {
      return NextResponse.json(
        { error: 'Currency code is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching institutions for currency: ${currency}`);
    const institutions = await fetchSupportedInstitutions(currency);
    
    return NextResponse.json(institutions);
  } catch (error) {
    console.error('Error fetching institutions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch institutions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
