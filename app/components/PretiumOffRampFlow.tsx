'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useSwitchChain, useWriteContract, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Loader2, ArrowRightIcon } from 'lucide-react';
import { ChevronDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { PretiumAsset, PretiumNetwork } from '../utils/pretium/types';

interface Stablecoin {
    baseToken: string;
    name: string;
    chainId: number;
    address: string;
    decimals: number;
    flag?: string;
}

interface PretiumOffRampFlowProps {
    country: {
        code: string;
        currency: string;
        flag: string;
        name: string;
    };
    walletAddress: string;
    onBack: () => void;
    stablecoins: Stablecoin[];
}

const NEDAPAY_API_BASE = 'https://api.nedapay.xyz';
const NEDAPAY_API_KEY = process.env.NEXT_PUBLIC_NEDAPAY_API_KEY;

export default function PretiumOffRampFlow({ country, walletAddress, stablecoins }: PretiumOffRampFlowProps) {
    const { isConnected, chainId, address } = useAccount();
    const { switchChain } = useSwitchChain();
    const { writeContractAsync } = useWriteContract();

    // Filter for USDC only
    const usdcToken = stablecoins.find(t => t.baseToken === 'USDC' && t.chainId === 8453); // Default to Base USDC

    // Form State
    const [selectedNetwork, setSelectedNetwork] = useState<string>('');
    const [recipientName, setRecipientName] = useState<string>('');
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [amount, setAmount] = useState<string>('');

    // UI State
    const [showProviderDropdown, setShowProviderDropdown] = useState(false);
    const [swipeProgress, setSwipeProgress] = useState(0);
    const [isSwipeComplete, setIsSwipeComplete] = useState(false);

    // Data State
    const [networks, setNetworks] = useState<PretiumNetwork[]>([]);
    const [exchangeRate, setExchangeRate] = useState<number | null>(null);
    const [vaultAddress, setVaultAddress] = useState<string | null>(null);

    // Loading/Error State
    const [isLoadingNetworks, setIsLoadingNetworks] = useState(false);
    const [isLoadingRate, setIsLoadingRate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [transactionHash, setTransactionHash] = useState<string | null>(null);

    // Balance
    const { data: balanceData, refetch: refetchBalance } = useBalance({
        address: address,
        token: usdcToken?.address as `0x${string}`,
        chainId: usdcToken?.chainId,
    });

    const walletBalance = balanceData ? parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(2) : '0.00';

    // Fetch Networks
    useEffect(() => {
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
        if (country.code) fetchNetworks();
    }, [country.code]);

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

    // Fetch Exchange Rate whenever currency changes or component mounts
    useEffect(() => {
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
    }, [country.currency]);


    const handleSendTransaction = async () => {
        if (!amount || !phoneNumber || !selectedNetwork || !vaultAddress || !usdcToken) {
            setError('Please complete all fields.');
            setIsSwipeComplete(false);
            setSwipeProgress(0);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Switch Chain if needed
            if (usdcToken.chainId && chainId !== usdcToken.chainId) {
                await switchChain({ chainId: usdcToken.chainId });
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // Send Crypto to Vault
            const amountBigInt = parseUnits(amount, usdcToken.decimals);

            const txHash = await writeContractAsync({
                address: usdcToken.address as `0x${string}`,
                abi: [
                    {
                        name: 'transfer',
                        type: 'function',
                        stateMutability: 'nonpayable',
                        inputs: [
                            { name: 'to', type: 'address' },
                            { name: 'amount', type: 'uint256' }
                        ],
                        outputs: [{ type: 'bool' }]
                    }
                ],
                functionName: 'transfer',
                args: [vaultAddress as `0x${string}`, amountBigInt],
                chainId: usdcToken.chainId
            });

            setTransactionHash(txHash);

            // Call Disburse API
            const targetAmount = exchangeRate ? (parseFloat(amount) * exchangeRate).toFixed(2) : '0';

            const disbursePayload = {
                transaction_hash: txHash,
                chain: 'BASE',
                destination: {
                    type: 'mobile_money',
                    account_number: phoneNumber,
                    account_name: recipientName || 'Beneficiary',
                    network_code: selectedNetwork,
                    country: country.code
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
                setSuccess(`Successfully sent ${amount} USDC! Recipient will receive ~${targetAmount} ${country.currency}`);
                // Reset form
                setAmount('');
                setPhoneNumber('');
                setRecipientName('');
                setSwipeProgress(0);
                setIsSwipeComplete(false);
            } else {
                throw new Error(result.message || 'Failed to initiate disbursement');
            }

        } catch (error: any) {
            console.error('Transaction error:', error);
            setError(error.message || 'Transaction failed');
            setIsSwipeComplete(false);
            setSwipeProgress(0);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedNetworkName = networks.find(n => n.code === selectedNetwork)?.name;

    if (success) {
        return (
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 backdrop-blur-sm mt-4">
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-green-900 mb-2">Transfer Complete!</h3>
                    <p className="text-green-800 text-sm mb-4">{success}</p>
                    {transactionHash && (
                        <a
                            href={`https://basescan.org/tx/${transactionHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 text-xs underline hover:text-blue-800"
                        >
                            View Transaction: {transactionHash.slice(0, 10)}...
                        </a>
                    )}
                    <button
                        onClick={() => {
                            setSuccess(null);
                            setTransactionHash(null);
                        }}
                        className="mt-4 w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg transition-all"
                    >
                        Send Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Mobile Money Provider - Custom Dropdown */}
            <div>
                <label className="block text-xs text-gray-300 font-medium mb-1">Select Provider</label>
                <div className="relative">
                    <button
                        onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                        className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            {selectedNetwork ? (
                                <>
                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-white">{selectedNetworkName}</span>
                                </>
                            ) : (
                                <span className="text-gray-400">{isLoadingNetworks ? 'Loading Providers...' : 'Choose Provider'}</span>
                            )}
                        </div>
                        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${showProviderDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showProviderDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-lg border border-slate-600 shadow-xl z-50 max-h-64 overflow-y-auto">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-slate-900/50 sticky top-0 z-10">
                                📱 Mobile Money
                            </div>
                            {networks.map((network) => (
                                <button
                                    key={network.code}
                                    onClick={() => {
                                        setSelectedNetwork(network.code);
                                        setShowProviderDropdown(false);
                                    }}
                                    className={`w-full px-3 py-2.5 text-left hover:bg-slate-700 flex items-center gap-3 text-sm transition-colors ${selectedNetwork === network.code ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''
                                        }`}
                                >
                                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-white flex-1">{network.name}</span>
                                    {selectedNetwork === network.code && (
                                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recipient Details - Compact 2-column layout */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Name</label>
                    <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-slate-700/80 text-white rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">
                        Phone Number
                    </label>
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder=""
                        className="w-full bg-slate-700/80 text-white rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Amount Input */}
            <div>
                <label className="block text-xs text-gray-400 mb-1">Enter Amount</label>
                <div className="bg-slate-700 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="10.00"
                            step="0.01"
                            className="bg-transparent text-white text-base font-light flex-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800 rounded-lg border border-slate-500/30">
                            <img src="/assets/logos/usdc-logo.png" alt="USDC" className="w-3.5 h-3.5" />
                            <span className="text-white text-xs font-medium">USDC</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-1">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-gray-400 text-xs">You'll pay</span>
                        {amount && exchangeRate && (
                            <div className="mt-1 text-xs text-gray-400 font-medium">
                                <span>≈ {(parseFloat(amount) * exchangeRate).toFixed(2)} {country.currency}</span>
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        {/* Network Label */}
                        <div className="flex items-center justify-end gap-1 mb-1">
                            <img src="/assets/logos/base-logo.jpg" alt="Base" className="w-3 h-3 rounded-full" />
                            <span className="text-white text-xs">Base</span>
                        </div>

                        {/* Balance */}
                        <div className="text-xs text-gray-400 flex items-center justify-end gap-2">
                            <span>Balance:</span>
                            <button
                                onClick={() => setAmount(walletBalance)}
                                className="text-blue-400 font-medium hover:text-blue-300 transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                                <img src="/assets/logos/usdc-logo.png" alt="USDC" className="w-3 h-3" />
                                USDC {walletBalance}
                            </button>
                            <button
                                onClick={() => refetchBalance()}
                                className="text-gray-400 hover:text-blue-400 transition-colors p-1 rounded hover:bg-slate-700/50"
                                title="Refresh balance"
                            >
                                <ArrowPathIcon className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="text-center text-xs text-gray-300 mb-2 font-semibold mt-2">
                    1 USDC = {isLoadingRate ? '...' : exchangeRate} {country.currency}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-xs text-center">{error}</p>
                </div>
            )}

            {/* Swipe to Send */}
            <div className="mt-4">
                <div className="relative bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-2xl p-1.5 overflow-hidden shadow-2xl shadow-green-500/30 border border-green-400/30">
                    {/* Progress Background */}
                    <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all duration-150 ease-in-out"
                        style={{ width: `${swipeProgress}%` }}
                    />

                    {/* Swipe Button Content */}
                    <div className="relative flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                                <ArrowRightIcon className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-white font-bold text-sm flex items-center gap-2">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : isSwipeComplete ? (
                                    'Sending...'
                                ) : 'Swipe to Send'}
                            </span>
                        </div>

                        <div className="text-white text-sm font-bold flex items-center gap-2">
                            <img src="/assets/logos/usdc-logo.png" alt="USDC" className="w-5 h-5" />
                            <span>{amount || '0'} USDC</span>
                        </div>
                    </div>

                    {/* Touch/Click Handler */}
                    <div
                        className="absolute inset-0 cursor-pointer"
                        onMouseDown={(e) => {
                            if (isSubmitting || isSwipeComplete) return;
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const startX = e.clientX - rect.left;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                const currentX = moveEvent.clientX - rect.left;
                                const progress = Math.min(Math.max(((currentX - startX) / rect.width) * 100, 0), 100);
                                setSwipeProgress(progress);

                                if (progress >= 80) {
                                    setIsSwipeComplete(true);
                                    // Trigger send
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                    setTimeout(() => handleSendTransaction(), 500);
                                }
                            };

                            const handleMouseUp = () => {
                                if (swipeProgress < 80) {
                                    setSwipeProgress(0);
                                }
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                            };

                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                        }}
                        onTouchStart={(e) => {
                            if (isSubmitting || isSwipeComplete) return;
                            // e.preventDefault(); // Don't prevent default to allow scrolling if not swiping? 
                            // Actually for swipe button usually want to prevent default
                            const rect = e.currentTarget.getBoundingClientRect();
                            const startX = e.touches[0].clientX - rect.left;

                            const handleTouchMove = (moveEvent: TouchEvent) => {
                                // moveEvent.preventDefault();
                                const currentX = moveEvent.touches[0].clientX - rect.left;
                                const progress = Math.min(Math.max(((currentX - startX) / rect.width) * 100, 0), 100);
                                setSwipeProgress(progress);

                                if (progress >= 80) {
                                    setIsSwipeComplete(true);
                                    document.removeEventListener('touchmove', handleTouchMove);
                                    document.removeEventListener('touchend', handleTouchEnd);
                                    setTimeout(() => handleSendTransaction(), 500);
                                }
                            };

                            const handleTouchEnd = () => {
                                if (swipeProgress < 80) {
                                    setSwipeProgress(0);
                                }
                                document.removeEventListener('touchmove', handleTouchMove);
                                document.removeEventListener('touchend', handleTouchEnd);
                            };

                            document.addEventListener('touchmove', handleTouchMove);
                            document.addEventListener('touchend', handleTouchEnd);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
