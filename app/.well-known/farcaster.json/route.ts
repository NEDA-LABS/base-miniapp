import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect(
    'https://api.farcaster.xyz/miniapps/hosted-manifest/019c32fd-da5e-4ea7-5a81-10deebe15d68',
    { status: 307 }
  );
}
