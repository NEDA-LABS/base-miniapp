'use client';

import { useState, useEffect, useRef } from 'react';
import { useWithdraw, WITHDRAW_COUNTRIES, getProviderForCountry, Stablecoin } from '@/contexts/WithdrawContext';
import { ChevronDownIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface CountryStepProps {
  walletBalance: string;
  stablecoins: Stablecoin[];
}

export default function CountryStep({ walletBalance, stablecoins }: CountryStepProps) {
  const { amount, country, selectCountry, goToAmount, goToProvider, asset } = useWithdraw();
  const [isOpen, setIsOpen] = useState(false);
  const [rate, setRate] = useState<string | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const geoFetched = useRef(false);

  useEffect(() => {
    if (!country || !amount) return;
    let cancelled = false;
    setLoadingRate(true);
    const provider = getProviderForCountry(country.code);

    if (provider === 'rampa') {
      fetch('/api/rampa/rates')
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          const ratesObj = data?.rates ?? data?.data?.rates;
          const sellRate = ratesObj?.sell_rate_usdc ?? ratesObj?.sell_rate_usdt;
          if (typeof sellRate === 'number' && sellRate > 0) {
            setRate(String(sellRate));
          } else {
            setRate(null);
          }
        })
        .catch(err => {
          if (!cancelled) setRate(null);
          console.error('Error fetching Rampa rate:', err);
        })
        .finally(() => { if (!cancelled) setLoadingRate(false); });
    } else {
      fetch(`/api/paycrest/rate?token=USDC&amount=${amount}&fiat=${country.currency}`)
        .then(r => r.json())
        .then(data => { if (!cancelled && data.rate) setRate(data.rate); })
        .catch(err => console.error('Error fetching rate:', err))
        .finally(() => { if (!cancelled) setLoadingRate(false); });
    }

    return () => { cancelled = true; };
  }, [country, amount]);

  useEffect(() => {
    if (country || geoFetched.current) return;
    geoFetched.current = true;
    fetch('/api/geolocation')
      .then(r => r.json())
      .then(data => {
        const matched = WITHDRAW_COUNTRIES.find(c => c.code === data.country) ?? WITHDRAW_COUNTRIES[0];
        selectCountry(matched);
      })
      .catch(() => selectCountry(WITHDRAW_COUNTRIES[0]));
  }, [country, selectCountry]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleCountrySelect = (c: typeof WITHDRAW_COUNTRIES[0]) => {
    selectCountry(c);
    setIsOpen(false);
  };

  const calculateReceivedAmount = () => {
    if (!rate || !amount) return '0.00';
    const r = parseFloat(rate);
    return (parseFloat(amount) * r).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-col h-full relative px-1">
      {/* Header */}
      <div className="text-center mb-6 pt-2">
        <h2 className="text-[#1C1917] text-base font-medium">Send Money Globally</h2>
        <p className="text-[#7C7468] text-xs mt-0.5">Select destination</p>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
        {/* Summary Card */}
        <div className="bg-[#F4EFE6] rounded-2xl p-4 border border-[#D4CEBE] flex items-center justify-between">
          <div>
            <p className="text-[#7C7468] text-xs mb-1">You&apos;re cashing out</p>
            <p className="text-[#1C1917] text-xl font-bold">{amount} {asset?.baseToken || 'USDC'}</p>
          </div>
          <button
            onClick={goToAmount}
            className="text-[#1C1917] text-xs font-medium hover:text-blue-600 transition-colors"
          >
            Edit
          </button>
        </div>

        {/* Cashout From Card */}
        <div className="bg-[#F4EFE6] rounded-2xl p-4 border border-[#D4CEBE]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#7C7468] text-xs font-medium">Cashout from</span>
            <span className="text-[#7C7468] text-[10px]">Available</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl border transition-all bg-[#1C1917]/5 border-[#1C1917]/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E8E2D9] flex items-center justify-center shrink-0">
                  <span className="text-xs">{asset?.flag || '🪙'}</span>
                </div>
                <div>
                  <p className="text-[#1C1917] text-sm font-semibold">{asset?.baseToken || 'USDC'}</p>
                  <p className="text-[#7C7468] text-[10px]">Available</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#1C1917] text-sm font-medium">{walletBalance}</span>
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Destination Card */}
        <div className="bg-[#F4EFE6] rounded-2xl p-4 border border-[#D4CEBE] relative">
          <p className="text-[#7C7468] text-xs font-medium mb-3">Destination</p>

          <div className="relative mb-4">
            <button
              onClick={toggleDropdown}
              className="w-full flex items-center justify-between bg-[#F0EBE3] p-3 rounded-xl border border-[#C8C1B4]/70 hover:bg-[#E8E2D9] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{country?.flag}</span>
                <span className="text-[#1C1917] text-sm font-medium">{country?.name}</span>
                <span className="text-[#7C7468] text-xs ml-1">{country?.currency}</span>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-[#7C7468]" />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#F4EFE6] border border-[#C8C1B4] rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
                {WITHDRAW_COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => handleCountrySelect(c)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#1C1917]/[0.04] transition-colors text-left"
                  >
                    <span className="text-xl">{c.flag}</span>
                    <div>
                      <span className="text-[#1C1917] text-sm block">{c.name}</span>
                      <span className="text-[#9B9188] text-xs">{c.currency}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rate Info */}
          <div className="bg-[#EDE8DF]/60 rounded-xl p-3 border border-[#C8C1B4]/40">
            <p className="text-[#7C7468] text-[10px] mb-1">Exchange rate</p>
            {loadingRate ? (
              <div className="h-4 w-24 bg-[#C8C1B4] rounded animate-pulse mb-1" />
            ) : (
              <p className="text-blue-600 text-xs font-medium mb-1">
                1 {asset?.baseToken || 'USDC'} ≈ {rate ? parseFloat(rate).toLocaleString() : '---'} {country?.currency}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <span className="text-[#7C7468] text-xs">You will receive</span>
              {loadingRate ? (
                <div className="h-4 w-20 bg-[#C8C1B4] rounded animate-pulse" />
              ) : (
                <span className="text-green-600 text-sm font-bold">
                  {calculateReceivedAmount()} {country?.currency}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="pt-4 pb-2">
        <button
          onClick={goToProvider}
          className="w-full py-3.5 bg-[#1C1917] text-white font-bold rounded-xl shadow-lg shadow-black/20 active:scale-[0.98] transition-all text-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
