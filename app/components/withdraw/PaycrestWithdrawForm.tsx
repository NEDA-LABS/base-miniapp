'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDownIcon, ArrowPathIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useWithdraw } from '@/contexts/WithdrawContext';
import { stablecoins } from '@/data/stablecoins';

interface Institution {
  name: string;
  code: string;
  type: string;
}

interface PaycrestWithdrawFormProps {
  walletAddress: string;
  walletBalance: string;
  onRefreshBalance: () => void;
  executeTransaction: (
    currency: 'local' | 'usdc',
    amount: string,
    recipient: {
      institution: string;
      accountIdentifier: string;
      accountName: string;
      memo: string;
    },
    flowType: 'send' | 'pay'
  ) => Promise<any>;
  switchChain: (params: { chainId: number }) => Promise<void>;
  isConnected: boolean;
  onSuccess: () => void;
}

export default function PaycrestWithdrawForm({
  walletAddress,
  walletBalance,
  onRefreshBalance,
  executeTransaction,
  switchChain,
  isConnected,
  onSuccess,
}: PaycrestWithdrawFormProps) {
  const { amount, country, goToCountry, reset } = useWithdraw();

  // Form state
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedToken, setSelectedToken] = useState('USDC');

  // UI state
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Data state
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);
  const [currentRate, setCurrentRate] = useState('0');
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch institutions when country changes
  useEffect(() => {
    if (!country) return;

    const loadInstitutions = async () => {
      setIsLoadingInstitutions(true);
      try {
        const response = await fetch(`/api/paycrest/institutions/${country.currency}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setInstitutions(data);
        } else if (data.data && Array.isArray(data.data)) {
          setInstitutions(data.data);
        }
      } catch (err) {
        console.error('Failed to load institutions:', err);
        setInstitutions([]);
      } finally {
        setIsLoadingInstitutions(false);
      }
    };

    loadInstitutions();
  }, [country]);

  // Fetch rate when token or country changes
  useEffect(() => {
    if (!country) return;

    const loadRate = async () => {
      setIsLoadingRate(true);
      try {
        const network = (selectedToken === 'USDT' || selectedToken === 'cUSD') ? 'celo' : 'base';
        const response = await fetch(
          `/api/paycrest/rate?token=${selectedToken}&amount=1&fiat=${country.currency}&network=${network}`
        );
        const data = await response.json();
        if (data.rate) {
          setCurrentRate(data.rate);
        } else if (typeof data === 'string' || typeof data === 'number') {
          setCurrentRate(String(data));
        }
      } catch (err) {
        console.error('Failed to fetch rate:', err);
      } finally {
        setIsLoadingRate(false);
      }
    };

    loadRate();
  }, [country, selectedToken]);

  const handleTransaction = useCallback(async () => {
    if (!amount || !phoneNumber || !country || !selectedInstitution) {
      setError('Please complete all fields');
      setIsSwipeComplete(false);
      setSwipeProgress(0);
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      // Switch chain if needed
      if (isConnected && switchChain) {
        const isCeloToken = selectedToken === 'USDT' || selectedToken === 'cUSD';
        const targetChainId = isCeloToken ? 42220 : 8453;
        try {
          await switchChain({ chainId: targetChainId });
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (err) {
          if (isCeloToken) {
            setError('Failed to switch to Celo network. Please switch manually.');
            setIsSwipeComplete(false);
            setSwipeProgress(0);
            setIsConfirming(false);
            return;
          }
        }
      }

      // Validate institution
      const institutionData = institutions.find(i => i.code === selectedInstitution);
      const isBank = institutionData?.type === 'bank';

      // Clean phone number
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      let accountIdentifier;
      if (isBank) {
        accountIdentifier = cleanPhone;
      } else {
        const countryCodeNumber = country.countryCode?.replace('+', '') || '';
        accountIdentifier = cleanPhone.startsWith(countryCodeNumber)
          ? cleanPhone
          : countryCodeNumber + cleanPhone;
      }

      const recipient = {
        institution: selectedInstitution,
        accountIdentifier,
        accountName: recipientName,
        memo: `Withdraw ${amount} ${selectedToken} to ${accountIdentifier}`,
      };

      const result = await executeTransaction('usdc', amount, recipient, 'send');

      if (!result) {
        throw new Error('Transaction failed - no result returned');
      }

      setSuccess(`Successfully sent ${amount} ${selectedToken}!`);
      setTimeout(() => {
        onSuccess();
        reset();
      }, 3000);
    } catch (err: any) {
      console.error('Transaction error:', err);
      setError(err.message || 'Transaction failed');
      setIsSwipeComplete(false);
      setSwipeProgress(0);
    } finally {
      setIsConfirming(false);
    }
  }, [amount, phoneNumber, country, selectedInstitution, selectedToken, recipientName, isConnected, switchChain, institutions, executeTransaction, onSuccess, reset]);

  if (!country) return null;

  // Success state
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

  const selectedInstitutionData = institutions.find(i => i.code === selectedInstitution);
  const localAmount = amount && currentRate ? (parseFloat(amount) * parseFloat(currentRate)).toFixed(2) : '0';

  return (
    <div className="flex flex-col h-full relative px-1">
      {/* Header */}
      <div className="text-center mb-6 pt-2 relative">
        <button
          onClick={goToCountry}
          className="absolute left-0 top-2 w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 text-white" />
        </button>
        <h2 className="text-white text-base font-medium">Send Money Globally</h2>
        <p className="text-gray-400 text-xs mt-0.5">Enter recipient details</p>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pb-20 no-scrollbar">
        {/* Summary Card */}
        <div className="bg-[#151925] rounded-2xl p-4 border border-slate-800/50 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs mb-1">You're sending</p>
            <p className="text-white text-xl font-bold">{amount} USDC</p>
          </div>
          <div className='flex items-center space-x-2'>
            <p className="text-gray-400 text-xs">
              To: <span className="font-medium text-gray-300">{country.flag} {country.name}</span>
            </p>
            <button 
              onClick={goToCountry}
              className="text-white text-xs font-medium hover:text-blue-400 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Recipient Card */}
        <div className="bg-[#151925] rounded-2xl p-4 border border-slate-800/50">
          <p className="text-gray-400 text-xs font-medium mb-3">Recipient Information</p>
          
          <div className="space-y-3">
            {/* Provider Selector */}
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Provider</label>
              <div className="relative">
                <button
                  onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                  disabled={isLoadingInstitutions}
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-slate-800 transition-colors flex items-center justify-between disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    {isLoadingInstitutions ? (
                      <>
                        <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-400 text-xs">Loading...</span>
                      </>
                    ) : selectedInstitution ? (
                      <>
                        {selectedInstitutionData?.type === 'mobile_money' ? (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        )}
                        <span className="text-white text-xs">{selectedInstitutionData?.name}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">Select a provider</span>
                    )}
                  </div>
                  <ChevronDownIcon className={`w-3 h-3 text-gray-400 transition-transform ${showProviderDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showProviderDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c2230] rounded-xl border border-slate-700 shadow-xl z-50 max-h-56 overflow-y-auto">
                    {/* Mobile Money Section */}
                    {institutions.filter(i => i.type === 'mobile_money').length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-[10px] font-semibold text-gray-500 bg-slate-900/50 sticky top-0 z-10 uppercase tracking-wide">
                          Mobile Money
                        </div>
                        {institutions.filter(i => i.type === 'mobile_money').map((inst) => (
                          <button
                            key={inst.code}
                            onClick={() => {
                              setSelectedInstitution(inst.code);
                              setShowProviderDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-slate-700/50 flex items-center gap-3 text-xs transition-colors ${
                              selectedInstitution === inst.code ? 'bg-blue-500/10 text-blue-400' : 'text-gray-300'
                            }`}
                          >
                            <span className="flex-1">{inst.name}</span>
                            {selectedInstitution === inst.code && (
                              <ArrowRightIcon className="w-3 h-3" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Banks Section */}
                    {institutions.filter(i => i.type === 'bank').length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-[10px] font-semibold text-gray-500 bg-slate-900/50 sticky top-0 z-10 uppercase tracking-wide">
                          Banks
                        </div>
                        {institutions.filter(i => i.type === 'bank').map((inst) => (
                          <button
                            key={inst.code}
                            onClick={() => {
                              setSelectedInstitution(inst.code);
                              setShowProviderDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-slate-700/50 flex items-center gap-3 text-xs transition-colors ${
                              selectedInstitution === inst.code ? 'bg-blue-500/10 text-blue-400' : 'text-gray-300'
                            }`}
                          >
                            <span className="flex-1">{inst.name}</span>
                            {selectedInstitution === inst.code && (
                              <ArrowRightIcon className="w-3 h-3" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">
                  {selectedInstitutionData?.type === 'bank' ? 'Account Number' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={selectedInstitutionData?.type === 'bank' ? 'e.g. 1234567890' : country.countryCode + '...'}
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-[#151925] rounded-2xl p-4 border border-slate-800/50">
          <p className="text-gray-400 text-xs font-medium mb-3">Summary</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">You send</span>
              <span className="text-white text-sm font-bold">{amount} {selectedToken}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">Recipient gets</span>
              <span className="text-green-400 text-sm font-bold">≈ {localAmount} {country.currency}</span>
            </div>
            
            <div className="h-px bg-slate-800/80 my-2" />
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-[10px]">Exchange Rate</span>
              <span className="text-gray-400 text-[10px]">
                1 {selectedToken} ≈ {isLoadingRate ? '...' : parseFloat(currentRate).toLocaleString()} {country.currency}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-[10px]">Wallet Balance</span>
              <div className="flex items-center gap-1">
                <span className="text-blue-400 text-[10px]">{walletBalance} USDC</span>
                <button onClick={onRefreshBalance} className="text-gray-500 hover:text-white">
                  <ArrowPathIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-xs text-center font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Swipe to Send */}
      <div className="mt-auto pt-2 pb-2">
        <div className="relative bg-slate-800/50 rounded-xl p-1 overflow-hidden shadow-lg border border-slate-700/50 h-14">
          {/* Track */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-500 text-xs font-medium tracking-wide animate-pulse">
              {isConfirming ? 'Confirming...' : isSwipeComplete ? 'Processing...' : 'Swipe to Withdraw'}
            </span>
          </div>

          {/* Progress Background */}
          <div
            className="absolute left-0 top-0 h-full bg-blue-600/20 transition-all duration-100 ease-out"
            style={{ width: `${Math.max(swipeProgress, 0)}%` }}
          />

          {/* Swipe Button */}
          <div
            className="absolute top-1 bottom-1 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing transition-transform duration-100 z-10"
            style={{ left: `calc(${Math.min(swipeProgress, 86)}% + 4px)` }}
            onMouseDown={(e) => {
              if (isConfirming || isSwipeComplete) return;
              e.preventDefault();
              const container = e.currentTarget.parentElement;
              if (!container) return;
              const rect = container.getBoundingClientRect();
              const startX = e.clientX;

              const handleMouseMove = (moveEvent: MouseEvent) => {
                const currentX = moveEvent.clientX;
                const delta = currentX - startX;
                const progress = Math.min(Math.max((delta / (rect.width - 56)) * 100, 0), 100);
                setSwipeProgress(progress);

                if (progress >= 95) {
                  setIsSwipeComplete(true);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  handleTransaction();
                }
              };

              const handleMouseUp = () => {
                if (swipeProgress < 95) {
                  setSwipeProgress(0);
                }
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
            onTouchStart={(e) => {
              if (isConfirming || isSwipeComplete) return;
              const container = e.currentTarget.parentElement;
              if (!container) return;
              const rect = container.getBoundingClientRect();
              const startX = e.touches[0].clientX;

              const handleTouchMove = (moveEvent: TouchEvent) => {
                const currentX = moveEvent.touches[0].clientX;
                const delta = currentX - startX;
                const progress = Math.min(Math.max((delta / (rect.width - 56)) * 100, 0), 100);
                setSwipeProgress(progress);

                if (progress >= 95) {
                  setIsSwipeComplete(true);
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                  handleTransaction();
                }
              };

              const handleTouchEnd = () => {
                if (swipeProgress < 95) {
                  setSwipeProgress(0);
                }
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
              };

              document.addEventListener('touchmove', handleTouchMove);
              document.addEventListener('touchend', handleTouchEnd);
            }}
          >
            <ArrowRightIcon className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
