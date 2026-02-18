'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSwitchChain, useWriteContract, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { ChevronDownIcon, ArrowPathIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useWithdraw, Stablecoin } from '@/contexts/WithdrawContext';
import { PretiumNetwork } from '@/utils/pretium/types';

interface PretiumWithdrawFormProps {
  walletAddress: string;
  stablecoins: Stablecoin[];
  switchChain: (params: { chainId: number }) => Promise<void>;
  isConnected: boolean;
  onSuccess: () => void;
}

const NEDAPAY_API_BASE = 'https://api.nedapay.xyz';
const NEDAPAY_API_KEY = process.env.NEXT_PUBLIC_NEDAPAY_API_KEY;

export default function PretiumWithdrawForm({ 
    walletAddress,
    stablecoins,
    switchChain,
    isConnected,
    onSuccess 
}: PretiumWithdrawFormProps) {
  const { amount, country, goToCountry, reset } = useWithdraw();
  const { chainId, address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const usdcToken = stablecoins.find(t => t.baseToken === 'USDC' && t.chainId === 8453); // Default to Base USDC

  // Form State
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  // UI State
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Data State
  const [networks, setNetworks] = useState<PretiumNetwork[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);

  // Loading/Error State
  const [isLoadingNetworks, setIsLoadingNetworks] = useState(false);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: balanceData, refetch: refetchBalance } = useBalance({
      address: address,
      token: usdcToken?.address as `0x${string}`,
      chainId: usdcToken?.chainId,
  });

  const walletBalance = balanceData ? parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(2) : '0.00';

  // Fetch Networks
  useEffect(() => {
    if (!country) return;
    const fetchNetworks = async () => {
        setIsLoadingNetworks(true);
        try {
            if (!NEDAPAY_API_KEY) return;
            const response = await fetch(
                `${NEDAPAY_API_BASE}/api/v1/ramp/pretium/networks?country=${country.code}`,
                { headers: { 'x-api-key': NEDAPAY_API_KEY } }
            );
            const data = await response.json();
            if (data.statusCode === 200 && Array.isArray(data.data)) {
                setNetworks(data.data);
            }
        } catch (err) {
            console.error('Failed to load networks', err);
        } finally {
            setIsLoadingNetworks(false);
        }
    };
    fetchNetworks();
  }, [country]);

  // Fetch Vault Address
  useEffect(() => {
      const fetchVault = async () => {
          try {
              if (!NEDAPAY_API_KEY) return;
              const response = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/pretium/account`, {
                  headers: { 'x-api-key': NEDAPAY_API_KEY }
              });
              const data = await response.json();
              if (data.status === 'success' && data.data?.networks) {
                  const networkData = (data.data.networks as any[]).find(
                      (n: any) => n.name.toUpperCase() === 'BASE'
                  );
                  if (networkData?.settlement_wallet_address) {
                      setVaultAddress(networkData.settlement_wallet_address);
                  }
              }
          } catch (err) {
              console.error('Vault fetch error:', err);
          }
      };
      fetchVault();
  }, []);

  // Fetch Exchange Rate
  useEffect(() => {
    if (!country) return;
    const fetchRate = async () => {
        setIsLoadingRate(true);
        try {
            if (!NEDAPAY_API_KEY || !country.currency) return;
            const response = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/pretium/exchange-rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': NEDAPAY_API_KEY
                },
                body: JSON.stringify({ currency_code: country.currency })
            });
            const data = await response.json();
            if (data.status === 'success' && data.data?.quoted_rate) {
                setExchangeRate(Number(data.data.quoted_rate));
            }
        } catch (err) {
            console.error('Rate fetch error:', err);
        } finally {
            setIsLoadingRate(false);
        }
    };
    fetchRate();
  }, [country]);

  const handleTransaction = useCallback(async () => {
    if (!amount || !phoneNumber || !selectedNetwork || !vaultAddress || !usdcToken) {
        setError('Please complete all fields.');
        setIsSwipeComplete(false);
        setSwipeProgress(0);
        return;
    }

    setIsConfirming(true);
    setError(null);

    try {
        if (isConnected && usdcToken.chainId && chainId !== usdcToken.chainId) {
            await switchChain({ chainId: usdcToken.chainId });
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const amountBigInt = parseUnits(amount, usdcToken.decimals);

        const txHash = await writeContractAsync({
            address: usdcToken.address as `0x${string}`,
            abi: [{
                name: 'transfer',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
                outputs: [{ type: 'bool' }]
            }],
            functionName: 'transfer',
            args: [vaultAddress as `0x${string}`, amountBigInt],
            chainId: usdcToken.chainId
        });

        const targetAmount = exchangeRate ? (parseFloat(amount) * exchangeRate).toFixed(2) : '0';

        const disbursePayload = {
            transaction_hash: txHash,
            chain: 'BASE',
            destination: {
                type: 'mobile_money',
                account_number: phoneNumber,
                account_name: recipientName || 'Beneficiary',
                network_code: selectedNetwork,
                country: country?.code
            },
            target_amount: Number(targetAmount),
            quote_id: "quote_" + Date.now()
        };

        const response = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/pretium/disburse`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': NEDAPAY_API_KEY || ''
            },
            body: JSON.stringify(disbursePayload)
        });

        const result = await response.json();

        if (result.status === 'success') {
            setSuccess(`Successfully sent ${amount} USDC!`);
            setTimeout(() => {
                onSuccess();
                reset();
            }, 3000);
        } else {
            throw new Error(result.message || 'Failed to initiate disbursement');
        }

    } catch (error: any) {
        console.error('Transaction error:', error);
        setError(error.message || 'Transaction failed');
        setIsSwipeComplete(false);
        setSwipeProgress(0);
    } finally {
        setIsConfirming(false);
    }
  }, [amount, phoneNumber, selectedNetwork, vaultAddress, usdcToken, isConnected, chainId, switchChain, writeContractAsync, exchangeRate, recipientName, country, onSuccess, reset]);

  if (!country) return null;

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

  const selectedNetworkName = networks.find(n => n.code === selectedNetwork)?.name;
  const localAmount = amount && exchangeRate ? (parseFloat(amount) * exchangeRate).toFixed(2) : '0.00';

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
          <p className="text-gray-400 text-xs font-medium mb-3">Recipient Information (via Pretium)</p>
          <div className="space-y-3">
            {/* Provider Selector */}
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Provider</label>
              <div className="relative">
                <button
                  onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                  disabled={isLoadingNetworks}
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-slate-800 transition-colors flex items-center justify-between disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    {isLoadingNetworks ? (
                      <>
                        <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-400 text-xs">Loading...</span>
                      </>
                    ) : selectedNetwork ? (
                      <>
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-white text-xs">{selectedNetworkName}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">Select a provider</span>
                    )}
                  </div>
                  <ChevronDownIcon className={`w-3 h-3 text-gray-400 transition-transform ${showProviderDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showProviderDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c2230] rounded-xl border border-slate-700 shadow-xl z-50 max-h-56 overflow-y-auto">
                    {networks.map((network) => (
                      <button
                        key={network.code}
                        onClick={() => {
                          setSelectedNetwork(network.code);
                          setShowProviderDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-slate-700/50 flex items-center gap-3 text-xs transition-colors ${
                          selectedNetwork === network.code ? 'bg-blue-500/10 text-blue-400' : 'text-gray-300'
                        }`}
                      >
                        <span className="flex-1">{network.name}</span>
                        {selectedNetwork === network.code && (
                          <ArrowRightIcon className="w-3 h-3" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Inputs */}
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
                <label className="block text-[10px] text-gray-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={'e.g. 233... '}
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
              <span className="text-gray-400 text-xs">Recipient gets</span>
              <span className="text-green-400 text-sm font-bold">≈ {localAmount} {country.currency}</span>
            </div>
            <div className="h-px bg-slate-800/80 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-[10px]">Exchange Rate</span>
              <span className="text-gray-400 text-[10px]">
                1 USDC ≈ {isLoadingRate ? '...' : exchangeRate?.toLocaleString()} {country.currency}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-[10px]">Wallet Balance</span>
              <div className="flex items-center gap-1">
                <span className="text-blue-400 text-[10px]">{walletBalance} USDC</span>
                <button onClick={() => refetchBalance()} className="text-gray-500 hover:text-white">
                  <ArrowPathIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-xs text-center font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Swipe to Send */}
      <div className="mt-auto pt-2 pb-2">
        <div className="relative bg-slate-800/50 rounded-xl p-1 overflow-hidden shadow-lg border border-slate-700/50 h-14">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-500 text-xs font-medium tracking-wide animate-pulse">
              {isConfirming ? 'Confirming...' : isSwipeComplete ? 'Processing...' : 'Swipe to Withdraw'}
            </span>
          </div>
          <div
            className="absolute left-0 top-0 h-full bg-blue-600/20 transition-all duration-100 ease-out"
            style={{ width: `${Math.max(swipeProgress, 0)}%` }}
          />
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
