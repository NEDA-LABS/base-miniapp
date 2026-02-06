import { NextResponse } from 'next/server';

export async function GET() {
  const farcasterConfig = {
    "accountAssociation": {
      "header": "eyJmaWQiOjg2OTUyNywidHlwZSI6ImF1dGgiLCJrZXkiOiIweDdFMzQ3N2M0RWQ2OUE4RTdBMDAxQzg3ZTlFQTI4ODJlOTc2NERDMzEifQ",
      "payload": "eyJkb21haW4iOiJtaW5pYXBwLm5lZGFwYXkueHl6In0",
      "signature": "eRFq8YzRNq1OTMQFm/3ph+TvcbS7vKRjc7iqpNohnNAjfLWi3f8fuzwMcNgzkmgMWyu31iUoQUf+dVzHVZw4MBw="
    },
    "frame": {
    "name": "NEDAPay",
    "version": "1",
    "iconUrl": "https://https://miniapp.nedapay.xyz/icon.png",
    "homeUrl": "https://https://miniapp.nedapay.xyz",
    "imageUrl": "https://miniapp.nedapay.xyz/og-image.png",
    "buttonTitle": "Launch App",
    "splashImageUrl": "https://https://miniapp.nedapay.xyz/splash.png",
    "splashBackgroundColor": "#1e40af",
    "webhookUrl": "https://https://miniapp.nedapay.xyz/api/webhook",
    "subtitle": "Global Stablecoin payments",
    "description": "NedaPay is a stablecoin payment solution for Africa. Send money to mobile money, create payment links, generate invoices, and accept crypto payments seamlessly.",
    "primaryCategory": "finance",
    "screenshotUrls": [
      "https://miniapp.nedapay.xyz/screenshot-send.png"
    ],
    "heroImageUrl": "https://miniapp.nedapay.xyz/og-image.png",
    "castShareUrl": "https://miniapp.nedapay.xyz",
    "ogTitle": "NEDApay - Stablecoin Payment",
    "ogDescription": "Send stablecoins to mobile money and bank accounts globally instantly.",
    "ogImageUrl": "https://miniapp.nedapay.xyz/og-image.png",
    "tags": [
      "finance",
      "payments",
      "community",
      "stablecoins",
      "settlements"
    ],
    "tagline": "Pay and  Accept Stablecoins "
  }
    // "frame": {
    //   "version": "1",
    //   "name": "NEDApay",
    //   "iconUrl": "https://miniapp.nedapay.xyz/icon-512.png",
    //   "homeUrl": "https://miniapp.nedapay.xyz",
    //   "imageUrl": "https://miniapp.nedapay.xyz/og-image.png",
    //   "buttonTitle": "Launch App",
    //   "splashImageUrl": "https://miniapp.nedapay.xyz/splash.png",
    //   "splashBackgroundColor": "#1e40af",
    //   "webhookUrl": "https://miniapp.nedapay.xyz/api/webhook",
    //   "subtitle": "Global Stablecoin payments",
    //   "description": "NedaPay is a stablecoin payment solution for Africa. Send money to mobile money, create payment links, generate invoices, and accept crypto payments seamlessly.",
    //   "screenshotUrls": [
    //     "https://miniapp.nedapay.xyz/screenshot-send.png"
    //   ],
    //   "primaryCategory": "finance",
    //   "tags": [
    //     "finance",
    //     "payments",
    //     "community"
    //   ],
    //   "heroImageUrl": "https://miniapp.nedapay.xyz/og-image.png",
    //   "ogTitle": "NEDApay - Stablecoin Payments",
    //   "ogDescription": "Send stablecoins to mobile money and bank accounts globally instantly.",
    //   "ogImageUrl": "https://miniapp.nedapay.xyz/og-image.png",
    //   "castShareUrl": "https://miniapp.nedapay.xyz"
    // }
  };


  return NextResponse.json(farcasterConfig, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
