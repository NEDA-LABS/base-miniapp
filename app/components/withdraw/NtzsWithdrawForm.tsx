'use client';

import { useState } from 'react';
import { useWithdraw, Stablecoin } from '@/contexts/WithdrawContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface NtzsWithdrawFormProps {
  walletAddress: string;
  stablecoins: Stablecoin[];
  switchChain: (params: { chainId: number }) => Promise<void>;
  isConnected: boolean;
  onSuccess: () => void;
}

export default function NtzsWithdrawForm({
  walletAddress,
  onSuccess,
}: NtzsWithdrawFormProps) {
  const { amount, country, goToCountry, asset } = useWithdraw();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTransaction = async () => {
    const isValidEmail = email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!amount || !phoneNumber) {
      setError('Please provide phone number');
      return;
    }
    if (!isValidEmail) {
      setError('Please provide a valid email address');
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      // 1. We call our backend API to perform the offramp via NTZS API
      const response = await fetch('/api/ntzs/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId: walletAddress || 'anonymous',
          email: email.trim(),
          phone: phoneNumber.trim(),
          amountTzs: Number(amount)
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Successfully initiated withdrawal of ${amount} ${asset?.baseToken}!`);
        setTimeout(() => {
          onSuccess();
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to initiate withdrawal');
      }
    } catch (err: any) {
      console.error('NTZS Withdraw Error:', err);
      setError(err.message || 'Transaction failed');
    } finally {
      setIsConfirming(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-5">
        <div className="bg-[#151925] rounded-2xl p-8 border border-slate-800/50 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Withdrawal Initiated!</h3>
          <p className="text-gray-400 text-sm">{success}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative px-1 max-w-md mx-auto">
      <div className="text-center mb-6 pt-2 relative">
        <button
          onClick={goToCountry}
          className="absolute left-0 top-2 w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 text-white" />
        </button>
        <h2 className="text-white text-base font-medium">Withdraw via M-Pesa</h2>
        <p className="text-gray-400 text-xs mt-0.5">Enter M-Pesa details</p>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pb-4 no-scrollbar">
        <div className="bg-[#151925] rounded-2xl p-4 border border-slate-800/50 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs mb-1">You're sending</p>
            <p className="text-white text-xl font-bold">{amount} {asset?.baseToken || 'NTZS'}</p>
          </div>
          <div className="text-right">
             <p className="text-gray-400 text-xs mb-1">You're receiving</p>
             <p className="text-green-400 text-xl font-bold">{amount} TZS</p>
          </div>
        </div>

        <div className="bg-[#151925] rounded-2xl p-4 border border-slate-800/50">
          <p className="text-gray-400 text-xs font-medium mb-3">Recipient Information</p>
          <div className="space-y-3">
            <div>
               <label className="block text-[10px] text-gray-400 mb-1">Email Address</label>
               <input
                 type="email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 placeholder="e.g. you@example.com"
                 className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 placeholder:text-gray-600 mb-3"
               />
            </div>
            <div>
               <label className="block text-[10px] text-gray-400 mb-1">M-Pesa Phone Number</label>
               <input
                 type="tel"
                 value={phoneNumber}
                 onChange={(e) => setPhoneNumber(e.target.value)}
                 placeholder="e.g. 255712345678"
                 className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 placeholder:text-gray-600"
               />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-xs text-center font-medium">{error}</p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 pb-2">
        <button
          onClick={handleTransaction}
          disabled={!phoneNumber || !email || isConfirming}
          className={`w-full py-4 text-white text-base font-bold rounded-2xl transition-all ${
             phoneNumber && email && !isConfirming
              ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 active:scale-[0.98]'
              : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/30'
          }`}
        >
          {isConfirming ? 'Processing...' : 'Confirm Withdrawal'}
        </button>
      </div>
    </div>
  );
}
