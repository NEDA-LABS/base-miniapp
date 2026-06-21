/** @type {import('next').NextConfig} */
const extraDevOrigins = (process.env.ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig = {
  // Allow ngrok/tunnel hosts to load Turbopack dev chunks (required for Farcaster/Base mini app dev)
  allowedDevOrigins: [
    '*.ngrok-free.dev',
    '*.ngrok.io',
    '*.ngrok.app',
    ...extraDevOrigins,
  ],
  // Set to static export mode
  // Completely ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },

  // Configure webpack with necessary polyfills (production build uses --webpack)
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify'),
      path: require.resolve('path-browserify'),
      buffer: require.resolve('buffer'),
    };
    return config;
  },
  // Transpile problematic packages
  transpilePackages: [
    'wagmi', 
    '@coinbase/onchainkit', 
    'viem', 
    'next-themes',
    'ethers',
    '@biconomy/abstractjs',
    '@biconomy/mexa',
    '@walletconnect/web3-provider',
    '@farcaster/miniapp-sdk',
    '@farcaster/miniapp-wagmi-connector'
  ],
  // Headers for Farcaster compatibility
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'ngrok-skip-browser-warning',
            value: 'true',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://farcaster.xyz https://*.farcaster.xyz https://warpcast.com https://client.warpcast.com https://wallet.farcaster.xyz https://wrpcd.net https://*.wrpcd.net https://base.org https://*.base.org https://base.xyz https://*.base.xyz https://base.app https://*.base.app https://app.base.org https://*.app.base.org;",
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://app.base.org/',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
      {
        source: '/.well-known/farcaster.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  // Use standard Next.js settings
  poweredByHeader: false,
  reactStrictMode: false,
  // Optimize for Netlify deployment
  trailingSlash: false,
  // Ensure proper handling of SVG and other static assets
  images: {
    // remotePatterns: ['nedapay.xyz'],
    dangerouslyAllowSVG: true,
  },
};

module.exports = nextConfig;
