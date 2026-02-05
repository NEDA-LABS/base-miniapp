import { NextResponse } from 'next/server';



export async function GET(req: Request) {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const merchantId = url.searchParams.get('merchantId');
    const status = url.searchParams.get('status') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // Validate merchantId
    if (!merchantId) {
      return NextResponse.json({ error: 'Merchant ID is required' }, { status: 400 });
    }

    // Build where clause for filtering
    const where: any = { merchantId };
    if (status) {
      where.status = status.toLowerCase();
    }

    // TODO: Fetch from dedicated backend
    const invoices: any[] = []; // Mock empty list for now

    // Get total count for pagination
    const totalInvoices = 0;
    const totalPages = 0;

    // Format response to match frontend expectations
    const formattedInvoices = invoices.map((invoice) => ({
      id: invoice.id,
      createdAt: invoice.createdAt.toISOString(),
      recipient: invoice.recipient,
      email: invoice.email,
      status: invoice.status,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      paymentLink: invoice.paymentLink,
    }));

    return NextResponse.json({
      invoices: formattedInvoices,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT(req: Request) {
  try {
    const { linkId, paidAt } = await req.json();

    if (!linkId || !paidAt) {
      return NextResponse.json(
        { error: 'Missing required fields: linkId and paidAt' },
        { status: 400 }
      );
    }

    // TODO: Update invoice in dedicated backend
    console.log('Update invoice requested:', { linkId, paidAt });

    return NextResponse.json({
      message: 'Invoice updated successfully',
      invoice: { id: 'mock_id' }
    });

  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }

}


export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}