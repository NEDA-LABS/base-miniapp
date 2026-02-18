'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWithdraw, WITHDRAW_COUNTRIES, Stablecoin } from '@/contexts/WithdrawContext';
import { ArrowLeftIcon, ChevronDownIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface CountryStepProps {
  walletBalance: string;
  stablecoins: Stablecoin[];
}

export default function CountryStep({ walletBalance, stablecoins }: CountryStepProps) {
  const { amount, country, selectCountry, goToAmount, goToProvider } = useWithdraw();
  const [isOpen, setIsOpen] = useState(false);
  const [rate, setRate] = useState<string | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);

  const fetchRate = useCallback(async (targetCountry: typeof WITHDRAW_COUNTRIES[0]) => {
    if (!amount) return;
    setLoadingRate(true);
    try {
      const res = await fetch(`/api/paycrest/rate?token=USDC&amount=${amount}&fiat=${targetCountry.currency}`);
      const data = await res.json();
      if (data.rate) {
        setRate(data.rate);
      }
    } catch (error) {
      console.error('Error fetching rate:', error);
    } finally {
      setLoadingRate(false);
    }
  }, [amount]);

  // Auto-select country based on geolocation or default to first country
  useEffect(() => {
    if (country) {
      fetchRate(country);
      return;
    }

    const autoSelectCountry = async () => {
      try {
        const response = await fetch('/api/geolocation');
        const data = await response.json();
        const userCountryCode = data.country;
        
        const matched = WITHDRAW_COUNTRIES.find(c => c.code === userCountryCode) ?? WITHDRAW_COUNTRIES[0];
        selectCountry(matched);
        fetchRate(matched);
      } catch (error) {
        console.error('Error fetching geolocation:', error);
        selectCountry(WITHDRAW_COUNTRIES[0]);
        fetchRate(WITHDRAW_COUNTRIES[0]);
      }
    };

    autoSelectCountry();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleCountrySelect = (c: typeof WITHDRAW_COUNTRIES[0]) => {
    selectCountry(c);
    fetchRate(c);
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
        <h2 className="text-white text-base font-medium">Send Money Globally</h2>
        <p className="text-gray-400 text-xs mt-0.5">Select destination</p>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
        {/* Summary Card */}
        <div className="bg-[#151925] rounded-2xl p-4 border border-slate-800/50 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs mb-1">You're cashing out</p>
            <p className="text-white text-xl font-bold">{amount} USDC</p>
          </div>
          <button 
            onClick={goToAmount}
            className="text-white text-xs font-medium hover:text-blue-400 transition-colors"
          >
            Edit
          </button>
        </div>

        {/* Cashout From Card */}
        <div className="bg-[#151925] rounded-2xl p-4 border border-slate-800/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-medium">Cashout from</span>
            <span className="text-gray-400 text-[10px]">Available</span>
          </div>
          
          <div className="space-y-2">
            {/* USDC (Main) */}
            <div className="flex items-center justify-between p-3 rounded-xl border transition-all bg-blue-500/10 border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <img src="/assets/logos/usdc-logo.png" alt="USDC" className="w-5 h-5" onError={(e) => e.currentTarget.src='https://cryptologos.cc/logos/usd-coin-usdc-logo.png'} />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">USDC</p>
                  <p className="text-gray-400 text-[10px]">Available</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white text-sm font-medium">{walletBalance}</span>
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Destination Card */}
        <div className="bg-[#151925] rounded-2xl p-4 border border-slate-800/50 relative">
          <p className="text-gray-400 text-xs font-medium mb-3">Destination</p>
          
          <div className="relative mb-4">
            <button 
              onClick={toggleDropdown}
              className="w-full flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{country?.flag}</span>
                <span className="text-white text-sm font-medium">{country?.name}</span>
                <span className="text-gray-400 text-xs ml-1">{country?.currency}</span>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c2230] border border-slate-700 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
                {WITHDRAW_COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => handleCountrySelect(c)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="text-xl">{c.flag}</span>
                    <div>
                      <span className="text-white text-sm block">{c.name}</span>
                      <span className="text-gray-500 text-xs">{c.currency}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rate Info */}
          <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
            <p className="text-gray-400 text-[10px] mb-1">Exchange rate</p>
            {loadingRate ? (
              <div className="h-4 w-24 bg-slate-700 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-blue-400 text-xs font-medium mb-1">
                1 USDC ≈ {rate ? parseFloat(rate).toLocaleString() : '---'} {country?.currency}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-2">
              <span className="text-gray-400 text-xs">You will receive</span>
              {loadingRate ? (
                <div className="h-4 w-20 bg-slate-700 rounded animate-pulse" />
              ) : (
                <span className="text-green-400 text-sm font-bold">
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
          className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all text-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
