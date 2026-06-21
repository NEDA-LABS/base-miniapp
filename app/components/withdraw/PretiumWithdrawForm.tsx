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

  const usdcToken = stablecoins.find(t => t.baseToken === 'USDC' && t.chainId === 8453);

  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [networks, setNetworks] = useState<PretiumNetwork[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
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
            if (data.statusCode === 200 && Array.isArray(data.data)) setNetworks(data.data);
        } catch (err) { console.error('Failed to load networks', err); }
        finally { setIsLoadingNetworks(false); }
    };
    fetchNetworks();
  }, [country]);

  useEffect(() => {
      const fetchVault = async () => {
          try {
              if (!NEDAPAY_API_KEY) return;
              const response = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/pretium/account`, {
                  headers: { 'x-api-key': NEDAPAY_API_KEY }
              });
              const data = await response.json();
              if (data.status === 'success' && data.data?.networks) {
                  const networkData = (data.data.networks as any[]).find((n: any) => n.name.toUpperCase() === 'BASE');
                  if (networkData?.settlement_wallet_address) setVaultAddress(networkData.settlement_wallet_address);
              }
          } catch (err) { console.error('Vault fetch error:', err); }
      };
      fetchVault();
  }, []);

  useEffect(() => {
    if (!country) return;
    const fetchRate = async () => {
        setIsLoadingRate(true);
        try {
            if (!NEDAPAY_API_KEY || !country.currency) return;
            const response = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/pretium/exchange-rate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': NEDAPAY_API_KEY },
                body: JSON.stringify({ currency_code: country.currency })
            });
            const data = await response.json();
            if (data.status === 'success' && data.data?.quoted_rate) setExchangeRate(Number(data.data.quoted_rate));
        } catch (err) { console.error('Rate fetch error:', err); }
        finally { setIsLoadingRate(false); }
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
            abi: [{ name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }],
            functionName: 'transfer',
            args: [vaultAddress as `0x${string}`, amountBigInt],
            chainId: usdcToken.chainId
        });
        const targetAmount = exchangeRate ? (parseFloat(amount) * exchangeRate).toFixed(2) : '0';
        const disbursePayload = {
            transaction_hash: txHash, chain: 'BASE',
            destination: { type: 'mobile_money', account_number: phoneNumber, account_name: recipientName || 'Beneficiary', network_code: selectedNetwork, country: country?.code },
            target_amount: Number(targetAmount), quote_id: 'quote_' + Date.now()
        };
        const response = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/pretium/disburse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': NEDAPAY_API_KEY || '' },
            body: JSON.stringify(disbursePayload)
        });
        const result = await response.json();
        if (result.status === 'success') {
            setSuccess(`Successfully sent ${amount} USDC!`);
            setTimeout(() => { onSuccess(); reset(); }, 3000);
        } else { throw new Error(result.message || 'Failed to initiate disbursement'); }
    } catch (error: any) {
        console.error('Transaction error:', error);
        setError(error.message || 'Transaction failed');
        setIsSwipeComplete(false);
        setSwipeProgress(0);
    } finally { setIsConfirming(false); }
  }, [amount, phoneNumber, selectedNetwork, vaultAddress, usdcToken, isConnected, chainId, switchChain, writeContractAsync, exchangeRate, recipientName, country, onSuccess, reset]);

  if (!country) return null;

  if (success) {
    return (
      <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[#1C1917] mb-2">Withdrawal Initiated!</h3>
        <p className="text-[#7C7468] text-sm">{success}</p>
      </div>
    );
  }

  const selectedNetworkName = networks.find(n => n.code === selectedNetwork)?.name;
  const localAmount = amount && exchangeRate ? (parseFloat(amount) * exchangeRate).toFixed(2) : '0.00';

  return (
    <div className="flex flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={goToCountry} className="w-10 h-10 rounded-full border border-[#C8C1B4] flex items-center justify-center hover:bg-[#E8E2D9] transition-colors shrink-0">
          <ArrowLeftIcon className="w-5 h-5 text-[#1C1917]" />
        </button>
        <div>
          <h2 className="text-[#1C1917] text-base font-medium">Recipient Details</h2>
          <p className="text-[#7C7468] text-xs">{country.flag} {country.name} · {amount} USDC</p>
        </div>
      </div>

      {/* Recipient card */}
      <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-4 space-y-4">
        <div className="text-[11px] font-medium text-[#7C7468]">Recipient details (via Pretium)</div>

        {/* Provider */}
        <div>
          <label className="block text-xs font-semibold text-[#1C1917] mb-2">Network / Provider</label>
          <div className="relative">
            <button
              onClick={() => setShowProviderDropdown(!showProviderDropdown)}
              disabled={isLoadingNetworks}
              className="w-full h-12 bg-[#EDE8DF] border border-[#C8C1B4]/70 rounded-xl px-3 text-sm hover:bg-[#E8E2D9] transition-colors flex items-center justify-between disabled:opacity-50"
            >
              <span className={selectedNetwork ? 'text-[#1C1917]' : 'text-[#9B9188]'}>
                {isLoadingNetworks ? 'Loading…' : selectedNetworkName || 'Select a provider'}
              </span>
              <ChevronDownIcon className={`w-4 h-4 text-[#7C7468] transition-transform ${showProviderDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showProviderDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#F4EFE6] rounded-xl border border-[#C8C1B4] shadow-xl z-50 max-h-52 overflow-y-auto">
                {networks.map((network) => (
                  <button
                    key={network.code}
                    onClick={() => { setSelectedNetwork(network.code); setShowProviderDropdown(false); }}
                    className={`w-full px-3 py-2.5 text-left text-sm hover:bg-[#E4DDD3] transition-colors ${selectedNetwork === network.code ? 'bg-blue-500/10 text-blue-700 font-medium' : 'text-[#1C1917]'}`}
                  >
                    {network.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-[#1C1917] mb-2">Full Name</label>
          <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. John Doe"
            className="w-full h-12 bg-[#EDE8DF] border border-[#C8C1B4]/70 text-[#1C1917] rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C1917]/20 placeholder:text-[#9B9188]" />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-semibold text-[#1C1917] mb-2">Phone Number</label>
          <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g. 233..."
            className="w-full h-12 bg-[#EDE8DF] border border-[#C8C1B4]/70 text-[#1C1917] rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C1917]/20 placeholder:text-[#9B9188]" />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[#7C7468] text-xs">Recipient gets</span>
          <span className="text-green-600 text-sm font-bold">≈ {localAmount} {country.currency}</span>
        </div>
        <div className="h-px bg-[#C8C1B4]/30" />
        <div className="flex justify-between items-center">
          <span className="text-[#7C7468] text-xs">Exchange rate</span>
          <span className="text-[#4A4540] text-xs">1 USDC ≈ {isLoadingRate ? '…' : exchangeRate?.toLocaleString()} {country.currency}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#7C7468] text-xs">Wallet balance</span>
          <div className="flex items-center gap-1">
            <span className="text-[#4A4540] text-xs">{walletBalance} USDC</span>
            <button onClick={() => refetchBalance()} className="text-[#7C7468] hover:text-[#1C1917]">
              <ArrowPathIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-600 text-xs text-center font-medium">{error}</p>
        </div>
      )}

      {/* Swipe to Withdraw */}
      <div className="relative bg-[#1C1917] rounded-2xl p-1.5 overflow-hidden shadow-lg shadow-black/20 border border-black/10">
        <div className="absolute left-0 top-0 h-full bg-white/20 rounded-full transition-all duration-100" style={{ width: `${swipeProgress}%` }} />
        <div className="relative flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
              <ArrowRightIcon className="w-4 h-4 text-[#1C1917]" />
            </div>
            <span className="text-white font-bold text-sm">
              {isConfirming ? 'Confirming…' : isSwipeComplete ? 'Processing…' : 'Swipe to Withdraw'}
            </span>
          </div>
          <span className="text-white text-sm font-bold">{amount} USDC</span>
        </div>
        <div className="absolute inset-0 cursor-pointer"
          onMouseDown={(e) => { if (isConfirming || isSwipeComplete) return; e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); const startX = e.clientX - rect.left; const move = (me: MouseEvent) => { const p = Math.min(Math.max(((me.clientX - rect.left - startX) / rect.width) * 100, 0), 100); setSwipeProgress(p); if (p >= 80) { setIsSwipeComplete(true); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); handleTransaction(); } }; const up = () => { if (swipeProgress < 80) setSwipeProgress(0); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }}
          onTouchStart={(e) => { if (isConfirming || isSwipeComplete) return; const rect = e.currentTarget.getBoundingClientRect(); const startX = e.touches[0].clientX - rect.left; const move = (me: TouchEvent) => { me.preventDefault(); const p = Math.min(Math.max(((me.touches[0].clientX - rect.left - startX) / rect.width) * 100, 0), 100); setSwipeProgress(p); if (p >= 80) { setIsSwipeComplete(true); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end); handleTransaction(); } }; const end = () => { if (swipeProgress < 80) setSwipeProgress(0); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end); }; document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', end); }}
        />
      </div>
    </div>
  );
}
