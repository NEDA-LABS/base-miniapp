import { NextResponse } from 'next/server';



export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // TODO: Fetch from dedicated backend
    const invoice = {
      id: params.id,
      createdAt: new Date(),
      recipient: 'Mock Recipient',
      email: 'mock@example.com',
      status: 'outstanding',
      totalAmount: 100.00,
      currency: 'USDC',
      paymentLink: { url: 'https://mock-link.com' },
      lineItems: [],
      dueDate: new Date(),
      paymentCollection: 'USDC'
    };

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: invoice.id,
      createdAt: invoice.createdAt.toISOString(),
      recipient: invoice.recipient,
      email: invoice.email,
      status: invoice.status,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      paymentLink: invoice.paymentLink,
      lineItems: invoice.lineItems,
      dueDate: invoice.dueDate.toISOString(),
      paymentCollection: invoice.paymentCollection,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}