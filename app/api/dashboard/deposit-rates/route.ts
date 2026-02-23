import { NextResponse } from 'next/server';

const NEDAPAY_API_BASE = 'https://api.nedapay.xyz';
const NEDAPAY_API_KEY = process.env.NEDAPAY_API_KEY || '';

type Provider = 'pretium' | 'snaville';

type DepositRateItem = {
    provider: Provider;
    fiat: string;
    countryCode: string;
    asset: string;
    rate: number;
    sellRate?: number;
    flag: string;
};

const getCountryFlag = (countryCode: string): string => {
    const flags: Record<string, string> = {
        GH: 'https://purecatamphetamine.github.io/country-flag-icons/3x2/GH.svg',
        KE: 'https://purecatamphetamine.github.io/country-flag-icons/3x2/KE.svg',
        MW: 'https://purecatamphetamine.github.io/country-flag-icons/3x2/MW.svg',
        CD: 'https://purecatamphetamine.github.io/country-flag-icons/3x2/CD.svg',
        UG: 'https://purecatamphetamine.github.io/country-flag-icons/3x2/UG.svg',
        TZ: 'https://purecatamphetamine.github.io/country-flag-icons/3x2/TZ.svg',
        NG: 'https://purecatamphetamine.github.io/country-flag-icons/3x2/NG.svg',
        ZA: 'https://purecatamphetamine.github.io/country-flag-icons/3x2/ZA.svg',
    };
    return flags[countryCode.toUpperCase()] || 'https://purecatamphetamine.github.io/country-flag-icons/3x2/US.svg';
};

const PRETIUM_FIATS: Array<{ fiat: string; countryCode: string }> = [
    { fiat: 'GHS', countryCode: 'GH' },
    { fiat: 'KES', countryCode: 'KE' },
    { fiat: 'MWK', countryCode: 'MW' },
    { fiat: 'CDF', countryCode: 'CD' },
    { fiat: 'UGX', countryCode: 'UG' },
];

export async function GET() {
    try {
        // Fetch Pretium rates and Snaville rates in parallel
        const [pretiumRates, snavilleRatesRes] = await Promise.all([
            // Pretium: fetch exchange rate for each fiat in parallel
            Promise.all(
                PRETIUM_FIATS.map(async ({ fiat, countryCode }) => {
                    try {
                        const res = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/pretium/exchange-rate`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-api-key': NEDAPAY_API_KEY,
                            },
                            body: JSON.stringify({ currency_code: fiat }),
                        });

                        if (!res.ok) return null;
                        const data = await res.json();
                        const rateData = data?.data;
                        if (!rateData) return null;

                        const buyingRate = Number(rateData.buying_rate);
                        const sellingRate = Number(rateData.selling_rate);
                        const quotedRate = Number(rateData.quoted_rate);

                        // Use quoted_rate if available, otherwise average of buy/sell
                        let rate: number;
                        if (Number.isFinite(quotedRate) && quotedRate > 0) {
                            rate = quotedRate;
                        } else if (Number.isFinite(buyingRate) && Number.isFinite(sellingRate) && buyingRate > 0 && sellingRate > 0) {
                            rate = (buyingRate + sellingRate) / 2;
                        } else {
                            return null;
                        }

                        const item: DepositRateItem = {
                            provider: 'pretium',
                            fiat,
                            countryCode,
                            asset: 'USDC',
                            rate,
                            flag: getCountryFlag(countryCode),
                        };

                        return item;
                    } catch {
                        return null;
                    }
                })
            ),
            // Snaville: fetch TZS rates
            (async () => {
                try {
                    const res = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/snaville/rates`, {
                        headers: { 'x-api-key': NEDAPAY_API_KEY },
                    });
                    if (!res.ok) return null;
                    return await res.json();
                } catch {
                    return null;
                }
            })(),
        ]);

        // Build Snaville item for TZS
        const snavilleItem: DepositRateItem | null = (() => {
            const buyRate = Number(snavilleRatesRes?.rates?.buy_rate);
            const sellRate = Number(snavilleRatesRes?.rates?.sell_rate);
            if (!Number.isFinite(buyRate) || buyRate <= 0) return null;
            return {
                provider: 'snaville',
                fiat: 'TZS',
                countryCode: 'TZ',
                asset: 'USDT',
                rate: buyRate,
                sellRate: Number.isFinite(sellRate) && sellRate > 0 ? sellRate : undefined,
                flag: getCountryFlag('TZ'),
            };
        })();

        const items = [
            ...pretiumRates.filter(Boolean),
            ...(snavilleItem ? [snavilleItem] : []),
        ] as DepositRateItem[];

        return NextResponse.json(
            {
                statusCode: 200,
                message: 'success',
                data: items,
                updatedAt: new Date().toISOString(),
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
                },
            }
        );
    } catch (error: any) {
        return NextResponse.json(
            {
                statusCode: 500,
                message: 'Failed to fetch deposit rates',
                error: error?.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}
