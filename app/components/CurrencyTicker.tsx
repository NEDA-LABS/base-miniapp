'use client';

import React, { useEffect, useState, useCallback } from 'react';

const getCountryFlag = (currencyCode: string): string => {
    switch (currencyCode) {
        case 'KES': return 'https://purecatamphetamine.github.io/country-flag-icons/3x2/KE.svg';
        case 'NGN': return 'https://purecatamphetamine.github.io/country-flag-icons/3x2/NG.svg';
        case 'TZS': return 'https://purecatamphetamine.github.io/country-flag-icons/3x2/TZ.svg';
        case 'UGX': return 'https://purecatamphetamine.github.io/country-flag-icons/3x2/UG.svg';
        case 'GHS': return 'https://purecatamphetamine.github.io/country-flag-icons/3x2/GH.svg';
        case 'ZAR': return 'https://purecatamphetamine.github.io/country-flag-icons/3x2/ZA.svg';
        case 'MWK': return 'https://purecatamphetamine.github.io/country-flag-icons/3x2/MW.svg';
        case 'CDF': return 'https://purecatamphetamine.github.io/country-flag-icons/3x2/CD.svg';
        default: return 'https://purecatamphetamine.github.io/country-flag-icons/3x2/US.svg';
    }
};

const CURRENCY_NAMES: Record<string, string> = {
    KES: 'Kenyan Shilling',
    NGN: 'Nigerian Naira',
    TZS: 'Tanzanian Shilling',
    UGX: 'Ugandan Shilling',
    GHS: 'Ghanaian Cedi',
    ZAR: 'South African Rand',
    MWK: 'Malawian Kwacha',
    CDF: 'Congolese Franc',
};

const PROVIDER_LABELS: Record<string, string> = {
    pretium: 'Pretium',
    snaville: 'Snaville',
    paycrest: 'Paycrest',
};

interface RatePair {
    flag: string;
    provider?: string;
    buy?: { rate: number; asset: string };
    sell?: { rate: number; asset: string };
}

// ─── Popup Card ──────────────────────────────────────────────────────────────

interface RatesPopupProps {
    pairs: Record<string, RatePair>;
    loading: boolean;
    updatedAt: Date | null;
    onClose: () => void;
    onRefresh: () => void;
}

const RatesPopup: React.FC<RatesPopupProps> = ({ pairs, loading, updatedAt, onClose, onRefresh }) => {
    const entries = Object.entries(pairs);

    const fmt = (n: number, decimals = 2) =>
        n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    const timeAgo = updatedAt
        ? `${Math.round((Date.now() - updatedAt.getTime()) / 1000)}s ago`
        : '—';

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Card */}
            <div
                className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border overflow-hidden bg-slate-900 border-slate-700/60"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-500/10">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm text-slate-100">Live Exchange Rates</h3>
                            <p className="text-[11px] text-slate-500">1 USDC/USDT per local currency</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-800 text-slate-400 ${loading ? 'opacity-50' : ''}`}
                            title="Refresh rates"
                        >
                            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg transition-colors hover:bg-slate-800 text-slate-400"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-800/40">
                    <span>Currency</span>
                    <span className="text-right w-24">Buy Rate</span>
                    <span className="text-right w-24">Sell Rate</span>
                    <span className="text-right w-16">Asset</span>
                </div>

                {/* Rows */}
                <div className="divide-y max-h-[60vh] overflow-y-auto divide-slate-800">
                    {entries.length === 0 && (
                        <div className="py-10 text-center text-sm text-slate-500">
                            {loading ? 'Loading rates…' : 'No rates available'}
                        </div>
                    )}
                    {entries.map(([code, pair]) => (
                        <div
                            key={code}
                            className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-5 py-3 transition-colors hover:bg-slate-800/40"
                        >
                            {/* Currency info */}
                            <div className="flex items-center gap-3 min-w-0">
                                <img src={pair.flag} alt={code} className="w-6 h-4 rounded-sm flex-shrink-0 shadow-sm" />
                                <div className="min-w-0">
                                    <div className="font-semibold text-sm text-slate-100">{code}</div>
                                    <div className="text-[11px] truncate text-slate-500">
                                        {CURRENCY_NAMES[code] || code}
                                        {pair.provider && (
                                            <span className="ml-1.5 px-1 py-0.5 rounded text-[9px] font-medium bg-slate-700 text-slate-400">
                                                {PROVIDER_LABELS[pair.provider] || pair.provider}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Buy rate */}
                            <div className="w-24 text-right">
                                {pair.buy ? (
                                    <div>
                                        <div className="font-mono font-semibold text-sm text-emerald-400">
                                            {fmt(pair.buy.rate)}
                                        </div>
                                        <div className="text-[10px] flex items-center justify-end gap-0.5 text-emerald-500/70">
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                            <span>BUY</span>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-600">—</span>
                                )}
                            </div>

                            {/* Sell rate */}
                            <div className="w-24 text-right">
                                {pair.sell ? (
                                    <div>
                                        <div className="font-mono font-semibold text-sm text-rose-400">
                                            {fmt(pair.sell.rate)}
                                        </div>
                                        <div className="text-[10px] flex items-center justify-end gap-0.5 text-rose-500/70">
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                            </svg>
                                            <span>SELL</span>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-600">—</span>
                                )}
                            </div>

                            {/* Asset badge */}
                            <div className="w-16 text-right">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400">
                                    {pair.buy?.asset || pair.sell?.asset || '—'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t text-[11px] border-slate-800 text-slate-500 bg-slate-800/20">
                    <div className="flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Rates are indicative. Final rate set at transaction time.</span>
                    </div>
                    <span>Updated {timeAgo}</span>
                </div>
            </div>
        </div>
    );
};

// ─── Main Ticker ─────────────────────────────────────────────────────────────

const CurrencyTicker = () => {
    const [pairs, setPairs] = useState<Record<string, RatePair>>({});
    const [loading, setLoading] = useState(true);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const fetchRates = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch buy rates from deposit-rates API and sell rates from Paycrest in parallel
            const [depositRes, paycrestSellRates] = await Promise.all([
                fetch('/api/dashboard/deposit-rates').then((r) => r.json()).catch(() => null),
                // Fetch Paycrest sell rates for supported currencies
                (async () => {
                    const offrampCurrencies = ['KES', 'NGN', 'TZS', 'UGX', 'ZAR'];
                    const results: Record<string, string> = {};
                    await Promise.all(
                        offrampCurrencies.map(async (currency) => {
                            try {
                                const res = await fetch(`/api/paycrest/rate?token=USDC&amount=1&fiat=${currency}`);
                                if (res.ok) {
                                    const data = await res.json();
                                    if (data.rate) results[currency] = data.rate;
                                }
                            } catch {
                                // Skip failed rate fetches silently
                            }
                        })
                    );
                    return results;
                })(),
            ]);

            const groupedRates: Record<string, RatePair> = {};

            // Process deposit (BUY) rates
            const depositItems = Array.isArray(depositRes?.data) ? depositRes.data : [];
            depositItems.forEach((i: any) => {
                const code = String(i?.fiat || '').toUpperCase();
                const rateNum = Number(i?.rate);
                if (!code || !Number.isFinite(rateNum) || rateNum <= 0) return;

                if (!groupedRates[code]) {
                    groupedRates[code] = { flag: String(i?.flag || getCountryFlag(code)), provider: i?.provider };
                }
                groupedRates[code].buy = { rate: rateNum, asset: String(i?.asset || 'USDC') };

                // If the provider also returned a sell rate (e.g. Snaville)
                const sellRateNum = Number(i?.sellRate);
                if (Number.isFinite(sellRateNum) && sellRateNum > 0) {
                    groupedRates[code].sell = { rate: sellRateNum, asset: String(i?.asset || 'USDT') };
                }
            });

            // Process off-ramp (SELL) rates from Paycrest
            if (paycrestSellRates) {
                Object.entries(paycrestSellRates).forEach(([code, rateStr]) => {
                    const rateNum = Number(rateStr);
                    if (!Number.isFinite(rateNum) || rateNum <= 0) return;

                    if (!groupedRates[code]) {
                        groupedRates[code] = { flag: getCountryFlag(code), provider: 'paycrest' };
                    }
                    // Only set sell if not already set by a provider (e.g. Snaville already set TZS sell)
                    if (!groupedRates[code].sell) {
                        groupedRates[code].sell = { rate: rateNum, asset: 'USDC' };
                    }
                    if (!groupedRates[code].provider) {
                        groupedRates[code].provider = 'paycrest';
                    }
                });
            }

            setPairs(groupedRates);
            setUpdatedAt(new Date());
        } catch {
            console.log('rates failed');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRates();
    }, [fetchRates]);

    const entries = Object.entries(pairs);

    return (
        <>
            {/* ── Ticker Bar ── */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="currency-ticker group rounded-xl backdrop-blur h-10 p-2 w-full mx-auto overflow-x-hidden overflow-y-hidden relative z-10 border flex items-center cursor-pointer transition-all duration-200 bg-[#0A0F1C]/60 border-slate-700/40 hover:border-slate-600 hover:bg-slate-900/50 mb-3"
                title="Click to view all rates"
            >
                {/* Scrolling content */}
                <div className="flex-1 overflow-hidden">
                    {loading && entries.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Loading rates…</span>
                        </div>
                    ) : (
                        <div className="ticker-track flex items-center gap-6 w-max">
                            {[...entries, ...entries].map(([code, pair], index) => (
                                <div key={`${code}-${index}`} className="flex items-center gap-2 text-xs whitespace-nowrap">
                                    <img src={pair.flag} alt={code} className="w-5 h-3.5 rounded-sm" />
                                    <span className="font-semibold text-xs text-slate-200">{code}</span>

                                    <div className="flex items-center gap-2 text-xs">
                                        {pair.buy && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide bg-emerald-400/10 text-emerald-300">
                                                    BUY
                                                </span>
                                                <span className="font-mono font-semibold text-emerald-200">
                                                    {pair.buy.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}

                                        {pair.buy && pair.sell && <span className="text-slate-600">/</span>}

                                        {pair.sell && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide bg-rose-400/10 text-rose-300">
                                                    SELL
                                                </span>
                                                <span className="font-mono font-semibold text-rose-200">
                                                    {pair.sell.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right-side "expand" hint */}
                <div className="flex-shrink-0 flex items-center gap-1 pl-2 pr-1 border-l ml-1 border-slate-700 text-slate-500 group-hover:text-blue-400 transition-colors">
                    <span className="text-[10px] font-medium hidden sm:block">Rates</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* ── Popup ── */}
            {isOpen && (
                <RatesPopup
                    pairs={pairs}
                    loading={loading}
                    updatedAt={updatedAt}
                    onClose={() => setIsOpen(false)}
                    onRefresh={() => { fetchRates(); }}
                />
            )}

            <style>{`
        .ticker-track {
          animation: ticker-scroll 30s linear infinite;
        }

        .currency-ticker:hover .ticker-track {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
          }
        }

        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
        </>
    );
};

export default CurrencyTicker;
