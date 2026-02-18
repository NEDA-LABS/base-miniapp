'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, Cog6ToothIcon, BackspaceIcon } from '@heroicons/react/24/outline';
import { useWithdraw } from '@/contexts/WithdrawContext';

interface AmountStepProps {
  walletBalance: string;
  onRefreshBalance: () => void;
  onBack: () => void;
}

export default function AmountStep({ walletBalance, onRefreshBalance, onBack }: AmountStepProps) {
  const { amount, setAmount, goToCountry } = useWithdraw();
  const [error, setError] = useState('');
  const [displayAmount, setDisplayAmount] = useState(amount || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local display state with context
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
      // Limit decimal places to 2
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

  const handleMax = () => {
    setDisplayAmount(walletBalance);
  };

  const handlePercentage = (percent: number) => {
    const balance = parseFloat(walletBalance) || 0;
    const calcAmount = (balance * (percent / 100)).toFixed(2);
    // Remove trailing zeros if it's a whole number
    setDisplayAmount(parseFloat(calcAmount).toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Basic validation to keep it numeric/decimal
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
          className="w-10 h-10 rounded-full border border-slate-700/50 flex items-center justify-center hover:bg-slate-800/50 transition-colors backdrop-blur-sm"
        >
          <ArrowLeftIcon className="w-5 h-5 text-white" />
        </button>
        <span className="text-white text-lg font-medium">Cash Out</span>
      </div>

      {/* Main Display */}
      <div className="flex-1 flex flex-col items-center justify-start">
        {/* <h2 className="text-white text-base font-normal mb-1">Send Money Globally</h2> */}
        <p className="text-slate-400 text-xs mb-2 font-medium">Enter amount</p>
        
        <div 
          className="flex flex-col items-center cursor-text active:scale-95 transition-transform"
          onClick={focusInput}
        >
          <span className={`text-4xl font-bold tracking-tight mb-2 ${!displayAmount ? 'text-slate-600' : 'text-white'}`}>
            {displayAmount || '0'}
          </span>
          <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">USDC</span>
        </div>

        {/* Error Message */}
        <div className="h-6 mt-4 flex items-center justify-center">
          {error && (
            <span className="text-red-400 text-xs bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 backdrop-blur-sm">
              {error}
            </span>
          )}
        </div>

        {/* Settings Button */}
        {/* <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
          <Cog6ToothIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
          <span className="text-sm font-medium">Settings</span>
        </button> */}
      </div>

      {/* Controls */}
      <div className="shrink-0 mt-auto pb-6">
        {/* Quick Amounts */}
        <div className="grid grid-cols-3 gap-3 mb-8 px-2">
          {[25, 50, 75].map((val) => (
            <button
              key={val}
              onClick={() => handlePercentage(val)}
              className="py-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-white text-sm font-medium hover:bg-slate-700/60 transition-colors backdrop-blur-sm"
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
              className="text-3xl font-medium text-white hover:text-blue-400 transition-colors flex justify-center items-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleNumberClick('.')}
            className="text-3xl font-medium text-white hover:text-blue-400 transition-colors flex justify-center items-center pb-2"
          >
            .
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            className="text-3xl font-medium text-white hover:text-blue-400 transition-colors flex justify-center items-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="flex items-center justify-center text-white hover:text-blue-400 transition-colors"
          >
            <BackspaceIcon className="w-7 h-7" />
          </button>
        </div>

        {/* Continue Button */}
        <div>
          <button
            onClick={handleNext}
            disabled={!displayAmount || parseFloat(displayAmount) <= 0 || !!error}
            className={`w-full py-4 text-white text-base font-bold rounded-2xl transition-all ${
              displayAmount && parseFloat(displayAmount) > 0 && !error
                ? 'bg-blue-600 shadow-lg shadow-blue-600/20 active:scale-[0.98]'
                : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/30'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
