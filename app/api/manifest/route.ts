import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://miniapp.nedapay.xyz';
  
  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjg2OTUyNywidHlwZSI6ImF1dGgiLCJrZXkiOiIweDdFMzQ3N2M0RWQ2OUE4RTdBMDAxQzg3ZTlFQTI4ODJlOTc2NERDMzEifQ",
      payload: "eyJkb21haW4iOiJtaW5pYXBwLm5lZGFwYXkueHl6In0",
      signature: "eRFq8YzRNq1OTMQFm/3ph+TvcbS7vKRjc7iqpNohnNAjfLWi3f8fuzwMcNgzkmgMWyu31iUoQUf+dVzHVZw4MBw="
    },
    miniapp: {
      version: '1',
      name: 'NEDApay',
      subtitle: 'Global Stablecoin payments',
      description: 'NedaPay is a Global stablecoin payment solution. Send money to mobile money, create payment links, generate invoices, and accept crypto payments seamlessly.',
      screenshotUrls: [
        `${baseUrl}/screenshot-send.png`,
        `${baseUrl}/screenshot-invoice.png`,
        `${baseUrl}/screenshot-link.png`
      ],
      iconUrl: `${baseUrl}/icon-512.png`,
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: '#1e40af',
      homeUrl: baseUrl,
      webhookUrl: `${baseUrl}/api/webhook`,
      primaryCategory: 'finance',
      tags: ['payments', 'stablecoins', 'mobile-money', 'africa', 'crypto'],
      heroImageUrl: `${baseUrl}/og-image.png`,
      tagline: 'Pay anywhere, Settle instantly',
      ogTitle: 'NEDApay - Stablecoin Payments',
      ogDescription: 'Send stablecoins to mobile money and bank accounts globally instantly.',
      ogImageUrl: `${baseUrl}/og-image.png`,
      castShareUrl: baseUrl
    },
    frame: {
      version: '1',
      name: 'NEDApay',
      iconUrl: `${baseUrl}/icon-192.png`,
      homeUrl: baseUrl,
      imageUrl: `${baseUrl}/og-image.png`,
      buttonTitle: '☄️ Launch NEDApay',
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: '#1e293b',
      webhookUrl: `${baseUrl}/api/webhook`
    }
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export const dynamic = 'force-dynamic';
