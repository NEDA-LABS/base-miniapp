import { NextResponse } from 'next/server';

export async function GET() {
  // Redirect to Farcaster hosted manifest URL for app discoverability
  return NextResponse.redirect(
    'https://api.farcaster.xyz/miniapps/hosted-manifest/019b687a-6abd-3133-7691-a9f2921ecfb7',
    307
  );
}
