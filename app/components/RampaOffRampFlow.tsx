'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useSwitchChain, useWriteContract, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { ChevronDownIcon, ArrowPathIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useWithdraw, Stablecoin, WithdrawCountry } from '@/contexts/WithdrawContext';

interface RampaOffRampFlowProps {
    country: WithdrawCountry;
    stablecoins: Stablecoin[];
    switchChain?: (params: { chainId: number }) => Promise<void>;
    isConnected?: boolean;
    onSuccess?: () => void;
    onBack?: () => void;
    preferredPayoutType?: 'mobile_money' | 'bank_transfer';
}



export default function RampaOffRampFlow({
    country,
    stablecoins,
    switchChain,
    isConnected,
    onSuccess,
    onBack,
    preferredPayoutType = 'mobile_money'
}: RampaOffRampFlowProps) {
    const { amount, goToCountry, reset } = useWithdraw();
    const { chainId, address } = useAccount();
    const { writeContractAsync } = useWriteContract();

    const usdcToken = stablecoins.find(t => t.baseToken === 'USDC' && t.chainId === 8453) || stablecoins[0];

    // Data State
    const [rates, setRates] = useState<any>(null);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [loadingRates, setLoadingRates] = useState(true);
    const [loadingMethods, setLoadingMethods] = useState(true);

    // Form State
    const [paymentCategory, setPaymentCategory] = useState<'mobile_money' | 'bank_transfer'>(preferredPayoutType);
    const [selectedNetwork, setSelectedNetwork] = useState<string>('');
    const [recipientName, setRecipientName] = useState<string>('');
    const [accountNumber, setAccountNumber] = useState<string>('');

    // UI State
    const [showProviderDropdown, setShowProviderDropdown] = useState(false);
    const [swipeProgress, setSwipeProgress] = useState(0);
    const [isSwipeComplete, setIsSwipeComplete] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const { data: balanceData, refetch: refetchBalance } = useBalance({
        address: address,
        token: usdcToken?.address as `0x${string}`,
        chainId: usdcToken?.chainId,
    });

    const walletBalance = balanceData ? parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(2) : '0.00';

    // Fetch Methods & Rates
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingRates(true);
            setLoadingMethods(true);

            try {
                const [ratesRes, methodsRes] = await Promise.all([
                    fetch(`/api/rampa/rates`),
                    fetch(`/api/rampa/payment-methods`)
                ]);

                const ratesData = await ratesRes.json();
                const methodsData = await methodsRes.json();

                // Backend returns raw data (rates.rates, limits); accept both wrapped and unwrapped
                if (ratesRes.ok && (ratesData.rates || ratesData.data?.rates)) {
                    setRates(ratesData.data || ratesData);
                }

                // Payment methods: backend returns { payment_methods: [...] }; include both mobile_money and bank_transfer
                if (methodsRes.ok && !methodsData.error) {
                    const mths = methodsData.data?.payment_methods || methodsData.payment_methods || [];
                    setPaymentMethods(mths);

                    const preferredMethods = mths.filter((m: any) => m.type === preferredPayoutType);
                    if (preferredMethods.length > 0) {
                        setSelectedNetwork(preferredMethods[0].id);
                    } else if (mths.length > 0) {
                        setSelectedNetwork(mths[0].id);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingRates(false);
                setLoadingMethods(false);
            }
        };
        fetchInitialData();
    }, [preferredPayoutType, country]);

    const activeRate = useMemo(() => {
        if (!rates?.rates) return null;
        return rates.rates.sell_rate_usdc;
    }, [rates]);

    const targetAmount = useMemo(() => {
        if (!amount || !activeRate) return 0;
        return Math.floor(parseFloat(amount) * activeRate);
    }, [amount, activeRate]);

    const filteredMethods = useMemo(() => {
        return paymentMethods.filter(m => m.type === paymentCategory);
    }, [paymentMethods, paymentCategory]);

    useEffect(() => {
        if (filteredMethods.length > 0 && !filteredMethods.find(m => m.id === selectedNetwork)) {
            setSelectedNetwork(filteredMethods[0].id);
        } else if (filteredMethods.length === 0) {
            setSelectedNetwork('');
        }
    }, [filteredMethods, selectedNetwork]);


    const handleTransaction = useCallback(async () => {
        if (!amount || !accountNumber || !selectedNetwork || !usdcToken) {
            setError('Please complete all fields.');
            setIsSwipeComplete(false);
            setSwipeProgress(0);
            return;
        }

        setIsConfirming(true);
        setError(null);

        try {
            if (isConnected && usdcToken.chainId && chainId !== usdcToken.chainId && switchChain) {
                await switchChain({ chainId: usdcToken.chainId });
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            const amountInWei = parseUnits(amount, usdcToken.decimals);
            // 1. Create Rampa Order to get deposit wallet
            const orderRes = await fetch(`/api/rampa/offramp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount_usdc: parseFloat(amount),
                    recipient_phone: accountNumber.replace(/\s+/g, ''),
                    recipient_name: recipientName.trim(),
                    payment_method_id: selectedNetwork,
                    network: 'BASE',
                    token: 'USDC',
                    country_code: country.code,
                })
            });

            const orderDataRaw = await orderRes.json();
            if (!orderRes.ok || !orderDataRaw.success || (!orderDataRaw.data?.order && !orderDataRaw.order)) {
                throw new Error(orderDataRaw.error || 'Failed to generate deposit wallet from provider.');
            }

            const orderData = orderDataRaw.data?.order || orderDataRaw.order;
            const depositWallet = orderData.deposit.wallet;

            if (!depositWallet) {
                throw new Error('Rampa provider did not return a valid deposit wallet.');
            }

            // 2. Transact
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
                args: [depositWallet as `0x${string}`, amountInWei],
                chainId: usdcToken.chainId
            });

            // 3. Verify
            try {
                await fetch(`/api/rampa/offramp/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        order_number: orderData.order_number,
                        tx_hash: txHash
                    })
                });
            } catch (e) {
                console.error(e);
                // Non-blocking error for UI
            }

            setSuccessMsg(`Successfully sent ${amount} USDC!`);
            setTimeout(() => {
                if (onSuccess) onSuccess();
                reset();
            }, 3000);

        } catch (error: any) {
            console.error('Transaction error:', error);
            setError(error.message || 'Transaction failed');
            setIsSwipeComplete(false);
            setSwipeProgress(0);
        } finally {
            setIsConfirming(false);
        }
    }, [amount, accountNumber, selectedNetwork, usdcToken, isConnected, chainId, switchChain, writeContractAsync, recipientName, country, onSuccess, reset]);

    if (!country) return null;

    if (successMsg) {
        return (
            <div className="space-y-5">
                <div className="bg-[#151925] rounded-2xl p-8 border border-slate-800/50 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Withdrawal Initiated!</h3>
                    <p className="text-gray-400 text-sm">{successMsg}</p>
                </div>
            </div>
        );
    }

    const selectedNetworkName = paymentMethods.find(m => m.id === selectedNetwork)?.provider || selectedNetwork;

    return (
        <div className="flex flex-col h-full relative px-1">
            {/* Header */}
            <div className="text-center mb-6 pt-2 relative">
                <button
                    onClick={onBack || goToCountry}
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
                    <p className="text-gray-400 text-xs font-medium mb-3">Recipient Information (via Rampa)</p>
                    {/* Rate in this step */}
                    {amount && (
                        <div className="mb-3 p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
                            <span className="text-gray-400 text-[10px]">Exchange rate: </span>
                            <span className="text-white text-xs font-medium">
                                1 USDC ≈ {loadingRates ? '...' : (activeRate?.toLocaleString() ?? '—')} {country.currency}
                            </span>
                        </div>
                    )}
                    <div className="space-y-3">
                        {/* Payment Type Toggle */}
                        <div className="flex bg-slate-900/40 p-1 rounded-xl border border-slate-700/40 mb-3">
                            <button
                                onClick={() => setPaymentCategory('mobile_money')}
                                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all ${paymentCategory === 'mobile_money' ? 'bg-blue-600/20 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Mobile Money
                            </button>
                            <button
                                onClick={() => setPaymentCategory('bank_transfer')}
                                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all ${paymentCategory === 'bank_transfer' ? 'bg-blue-600/20 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Bank Transfer
                            </button>
                        </div>

                        {/* Provider Selector */}
                        <div>
                            <label className="block text-[10px] text-gray-400 mb-1">Provider</label>
                            <div className="relative">
                                <button
                                    onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                                    disabled={loadingMethods}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-slate-800 transition-colors flex items-center justify-between disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-2">
                                        {loadingMethods ? (
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
                                        {filteredMethods.map((network) => (
                                            <button
                                                key={network.id}
                                                onClick={() => {
                                                    setSelectedNetwork(network.id);
                                                    setShowProviderDropdown(false);
                                                }}
                                                className={`w-full px-3 py-2 text-left hover:bg-slate-700/50 flex items-center gap-3 text-xs transition-colors ${selectedNetwork === network.id ? 'bg-blue-500/10 text-blue-400' : 'text-gray-300'
                                                    }`}
                                            >
                                                <span className="flex-1">{network.provider}</span>
                                                {selectedNetwork === network.id && (
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
                                <label className="block text-[10px] text-gray-400 mb-1">
                                    {paymentCategory === 'bank_transfer' ? 'Account Number' : 'Phone Number'}
                                </label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    placeholder={paymentCategory === 'bank_transfer' ? 'Bank Account No.' : 'e.g. 265... '}
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
                            <span className="text-green-400 text-sm font-bold">≈ {targetAmount.toLocaleString()} {country.currency}</span>
                        </div>
                        <div className="h-px bg-slate-800/80 my-2" />
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-[10px]">Exchange Rate</span>
                            <span className="text-gray-400 text-[10px]">
                                1 USDC ≈ {loadingRates ? '...' : activeRate?.toLocaleString()} {country.currency}
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
