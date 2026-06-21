'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, BackspaceIcon } from '@heroicons/react/24/outline';
import { Stablecoin, useWithdraw } from '@/contexts/WithdrawContext';

interface AmountStepProps {
  walletBalance: string;
  onRefreshBalance: () => void;
  onBack: () => void;
  stablecoins: Stablecoin[];
}

export default function AmountStep({ walletBalance, onRefreshBalance, onBack, stablecoins }: AmountStepProps) {
  const { amount, setAmount, goToCountry, asset, setAsset } = useWithdraw();
  const [error, setError] = useState('');
  const [displayAmount, setDisplayAmount] = useState(amount || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAmount(displayAmount);
    if (displayAmount && parseFloat(displayAmount) > parseFloat(walletBalance)) {
      setError('Insufficient balance');
    } else {
      setError('');
    }
  }, [displayAmount, setAmount, walletBalance]);

  const handleNumberClick = (num: string) => {
    if (displayAmount.includes('.') && num === '.') return;
    if (displayAmount === '0' && num !== '.') {
      setDisplayAmount(num);
    } else {
      if (displayAmount.includes('.')) {
        const parts = displayAmount.split('.');
        if (parts[1].length >= 2) return;
      }
      setDisplayAmount(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setDisplayAmount(prev => prev.slice(0, -1));
  };

  const handlePercentage = (percent: number) => {
    const balance = parseFloat(walletBalance) || 0;
    const calcAmount = (balance * (percent / 100)).toFixed(2);
    setDisplayAmount(parseFloat(calcAmount).toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setDisplayAmount(val);
    }
  };

  const handleNext = () => {
    const num = parseFloat(displayAmount);
    if (!displayAmount || isNaN(num) || num <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (num > parseFloat(walletBalance)) {
      setError('Insufficient balance');
      return;
    }
    setAmount(displayAmount);
    goToCountry();
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden px-4 py-2">
      {/* Hidden input to trigger native keyboard */}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayAmount}
        onChange={handleInputChange}
        className="absolute opacity-0 pointer-events-none h-0 w-0"
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-4 pt-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full border border-[#C8C1B4] flex items-center justify-center hover:bg-[#E8E2D9] transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-[#1C1917]" />
        </button>
        <span className="text-[#1C1917] text-lg font-medium">Cash Out</span>
      </div>

      {/* Main Display */}
      <div className="flex-1 flex flex-col items-center justify-start">
        <p className="text-[#7C7468] text-xs mb-2 font-medium">Enter amount</p>

        <div
          className="flex flex-col items-center cursor-text active:scale-95 transition-transform"
          onClick={focusInput}
        >
          <span className={`text-4xl font-bold tracking-tight mb-2 ${!displayAmount ? 'text-[#C8C1B4]' : 'text-[#1C1917]'}`}>
            {displayAmount || '0'}
          </span>
          <select
            value={asset?.baseToken || 'USDC'}
            onChange={(e) => {
              const selected = stablecoins.find(s => s.baseToken === e.target.value);
              if (selected) setAsset(selected);
            }}
            className="bg-[#E8E2D9] text-[#1C1917] text-sm font-medium uppercase tracking-wider rounded-lg px-2 py-1 appearance-none cursor-pointer outline-none border border-[#C8C1B4] hover:bg-[#E4DDD3] transition-colors text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {stablecoins.map(token => (
              <option key={token.baseToken} value={token.baseToken}>{token.baseToken}</option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        <div className="h-6 mt-4 flex items-center justify-center">
          {error && (
            <span className="text-red-500 text-xs bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 mt-auto pb-6">
        {/* Quick Amounts */}
        <div className="grid grid-cols-3 gap-3 mb-8 px-2">
          {[25, 50, 75].map((val) => (
            <button
              key={val}
              onClick={() => handlePercentage(val)}
              className="py-3 rounded-2xl bg-[#F0EBE3] border border-[#C8C1B4] text-[#1C1917] text-sm font-medium hover:bg-[#E8E2D9] transition-colors"
            >
              {val}%
            </button>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-y-4 mb-4 px-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className="text-3xl font-medium text-[#1C1917] hover:text-blue-600 transition-colors flex justify-center items-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleNumberClick('.')}
            className="text-3xl font-medium text-[#1C1917] hover:text-blue-600 transition-colors flex justify-center items-center pb-2"
          >
            .
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            className="text-3xl font-medium text-[#1C1917] hover:text-blue-600 transition-colors flex justify-center items-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="flex items-center justify-center text-[#1C1917] hover:text-blue-600 transition-colors"
          >
            <BackspaceIcon className="w-7 h-7" />
          </button>
        </div>

        {/* Continue Button */}
        <div>
          <button
            onClick={handleNext}
            disabled={!displayAmount || parseFloat(displayAmount) <= 0 || !!error}
            className={`w-full py-4 text-base font-bold rounded-2xl transition-all ${
              displayAmount && parseFloat(displayAmount) > 0 && !error
                ? 'bg-[#1C1917] text-white shadow-lg active:scale-[0.98]'
                : 'bg-[#E8E2D9] text-[#9B9188] cursor-not-allowed border border-[#C8C1B4]/40'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
