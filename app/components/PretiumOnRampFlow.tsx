'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import type { PretiumAsset, PretiumExchangeRateResponse, PretiumNetwork, PretiumStatusResponse } from '@/utils/pretium/types';
import { motion } from 'framer-motion';
import { stablecoins } from '@/data/stablecoins';
import SnavilleOnRampFlow from '@/components/SnavilleOnRampFlow';
import RampaOnRampFlow from '@/components/RampaOnRampFlow';
import NtzsOnRampFlow from '@/components/NtzsOnRampFlow';

type SupportedFiat = 'KES' | 'MWK' | 'CDF' | 'GHS' | 'UGX' | 'TZS';

const getCountryFlag = (countryCode: string): string => {
  const flags: Record<string, string> = {
    'GH': 'https://purecatamphetamine.github.io/country-flag-icons/3x2/GH.svg',
    'KE': 'https://purecatamphetamine.github.io/country-flag-icons/3x2/KE.svg',
    'MW': 'https://purecatamphetamine.github.io/country-flag-icons/3x2/MW.svg',
    'CD': 'https://purecatamphetamine.github.io/country-flag-icons/3x2/CD.svg',
    'UG': 'https://purecatamphetamine.github.io/country-flag-icons/3x2/UG.svg',
    'TZ': 'https://purecatamphetamine.github.io/country-flag-icons/3x2/TZ.svg',
  };
  return flags[countryCode] || '';
};

const getTokenIcon = (symbol: string): string => {
  const token = stablecoins.find(s => s.baseToken.toUpperCase() === symbol.toUpperCase());
  return token?.flag || '/default-token-icon.png';
};

const FIAT_OPTIONS: Array<{ code: SupportedFiat; countryCode: string; label: string; flag: string; p2p?: boolean }> = [
  { code: 'GHS', countryCode: 'GH', label: 'Ghana (GHS)', flag: getCountryFlag('GH') },
  { code: 'KES', countryCode: 'KE', label: 'Kenya (KES)', flag: getCountryFlag('KE') },
  { code: 'TZS', countryCode: 'TZ', label: 'Tanzania (TZS)', flag: getCountryFlag('TZ'), p2p: true },
  { code: 'MWK', countryCode: 'MW', label: 'Malawi (MWK)', flag: getCountryFlag('MW'), p2p: true },
  { code: 'CDF', countryCode: 'CD', label: 'DR Congo (CDF)', flag: getCountryFlag('CD') },
  { code: 'UGX', countryCode: 'UG', label: 'Uganda (UGX)', flag: getCountryFlag('UG') },
];

const ASSET_OPTIONS: PretiumAsset[] = ['USDC', 'USDT', 'NTZS'];

const NEDAPAY_API_BASE = 'https://api.nedapay.xyz';
const NEDAPAY_API_KEY = process.env.NEXT_PUBLIC_NEDAPAY_API_KEY;

type PretiumOnrampChain = 'BASE' | 'CELO';

interface PretiumOnRampFlowProps {
  walletAddress?: string;
  asset: PretiumAsset;
  onBack?: () => void;
  initialFiat?: SupportedFiat;
  initialAmount?: string;
}

export default function PretiumOnRampFlow({ walletAddress, asset, onBack, initialFiat, initialAmount }: PretiumOnRampFlowProps) {
  const { toast } = useToast();

  // Step 1: Configuration & Details
  const [fiat, setFiat] = useState<SupportedFiat>(initialFiat || 'GHS');
  const selectedFiatMeta = useMemo(() => FIAT_OPTIONS.find((f) => f.code === fiat)!, [fiat]);

  // Internal state for asset selection since parent may not provide a selector
  const [selectedAsset, setSelectedAsset] = useState<PretiumAsset>(asset);

  // Sync with prop only when it actually changes from the parent
  const prevAssetRef = useRef(asset);
  useEffect(() => {
    if (prevAssetRef.current !== asset) {
      setSelectedAsset(asset);
      prevAssetRef.current = asset;
    }
  }, [asset]);

  // Validation against available assets for the current fiat
  useEffect(() => {
    if (fiat === 'TZS' && selectedAsset === 'USDC') {
      setSelectedAsset('USDT');
    }
  }, [fiat, selectedAsset]);

  // Determine available assets based on selected fiat
  const availableAssets = useMemo(() => {
    if (fiat === 'TZS') {
      return ASSET_OPTIONS.filter(a => a !== 'USDC');
    }
    return ASSET_OPTIONS;
  }, [fiat]);

  // Step 2: Processing & Status
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [networks, setNetworks] = useState<PretiumNetwork[]>([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');

  const chainOptions = useMemo<PretiumOnrampChain[]>(() => {
    return selectedAsset === 'USDC' ? ['BASE'] : ['BASE', 'CELO'];
  }, [selectedAsset]);

  const [selectedChain, setSelectedChain] = useState<PretiumOnrampChain>(() => {
    return selectedAsset === 'USDC' ? 'BASE' : 'CELO';
  });

  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(initialAmount || '');
  const [submitting, setSubmitting] = useState(false);

  const [transactionCode, setTransactionCode] = useState<string | null>(null);
  const [status, setStatus] = useState<PretiumStatusResponse | null>(null);
  const [polling, setPolling] = useState(false);

  const [exchangeRate, setExchangeRate] = useState<PretiumExchangeRateResponse | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);

  const resolvedAddress = walletAddress || '';

  const quotedRate = useMemo(() => {
    const val = Number(exchangeRate?.quoted_rate);
    return Number.isFinite(val) && val > 0 ? val : null;
  }, [exchangeRate?.quoted_rate]);

  const estimatedReceive = useMemo(() => {
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return null;
    if (!quotedRate) return null;
    const stable = amountNumber / quotedRate;
    if (!Number.isFinite(stable) || stable <= 0) return null;
    return stable;
  }, [amount, quotedRate]);

  const statusUpper = useMemo(() => String(status?.status || '').toUpperCase(), [status?.status]);
  const statusTone = useMemo(() => {
    if (statusUpper === 'COMPLETE' || statusUpper === 'COMPLETED' || statusUpper === 'SUCCESS') return 'success';
    if (statusUpper === 'FAILED' || statusUpper === 'FAIL') return 'failed';
    if (statusUpper === 'PENDING' || statusUpper === 'PROCESSING') return 'pending';
    return 'pending';
  }, [statusUpper]);

  useEffect(() => {
    setSelectedNetwork('');
  }, [selectedFiatMeta.countryCode]);

  useEffect(() => {
    setSelectedChain(chainOptions[0]);
  }, [chainOptions]);

  useEffect(() => {
    const fetchNetworks = async () => {
      // Tanzania and Malawi use P2P flows, not Pretium networks
      if (fiat === 'TZS' || fiat === 'MWK') {
        setNetworks([]);
        setLoadingNetworks(false);
        return;
      }
      setLoadingNetworks(true);
      try {
        if (!NEDAPAY_API_KEY) {
          toast({
            title: 'Config Error',
            description: 'NEDAPAY API key is not configured.',
            variant: 'destructive',
          });
          setNetworks([]);
          return;
        }

        const res = await fetch(
          `${NEDAPAY_API_BASE}/api/v1/ramp/pretium/networks?country=${selectedFiatMeta.countryCode}`,
          {
            headers: {
              'x-api-key': NEDAPAY_API_KEY,
            },
          }
        );
        const data = await res.json();
        if (data.statusCode === 200 && Array.isArray(data.data)) {
          setNetworks(data.data);
        } else {
          setNetworks([]);
          toast({
            title: 'Error',
            description: data.message || 'Failed to load networks.',
            variant: 'destructive',
          });
        }
      } catch (err) {
        setNetworks([]);
        toast({
          title: 'Error',
          description: 'Failed to load networks.',
          variant: 'destructive',
        });
      } finally {
        setLoadingNetworks(false);
      }
    };

    fetchNetworks();
  }, [fiat, selectedFiatMeta.countryCode, toast]);

  useEffect(() => {
    const fetchRate = async () => {
      // Tanzania and Malawi use P2P flows, not Pretium rates
      if (fiat === 'TZS' || fiat === 'MWK') {
        setExchangeRate(null);
        setLoadingRate(false);
        return;
      }
      setLoadingRate(true);
      try {
        if (!NEDAPAY_API_KEY) {
          toast({
            title: 'Config Error',
            description: 'NEDAPAY API key is not configured.',
            variant: 'destructive',
          });
          setExchangeRate(null);
          return;
        }

        const res = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/pretium/exchange-rate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': NEDAPAY_API_KEY,
          },
          body: JSON.stringify({ currency_code: fiat }),
        });

        const data = await res.json();
        if (!res.ok) {
          setExchangeRate(null);
          toast({
            title: 'Rate Error',
            description: data.message || 'Failed to load exchange rate.',
            variant: 'destructive',
          });
          return;
        }

        setExchangeRate(data.data || null);
      } catch (err: any) {
        setExchangeRate(null);
        toast({
          title: 'Rate Error',
          description: err?.message || 'Failed to load exchange rate.',
          variant: 'destructive',
        });
      } finally {
        setLoadingRate(false);
      }
    };

    fetchRate();
  }, [fiat, toast]);

  useEffect(() => {
    if (networks.length === 0) return;

    const hasSelected = Boolean(selectedNetwork);
    const isValid = hasSelected ? networks.some((n) => n.code === selectedNetwork) : false;

    if (!hasSelected || !isValid) {
      setSelectedNetwork(networks[0].code);
    }
  }, [networks, selectedNetwork]);

  const isValidStep1 = useMemo(() => {
    const amountNumber = Number(amount);
    const validAmount = Number.isFinite(amountNumber) && amountNumber > 0;
    const validNetwork = Boolean(selectedNetwork);
    const validPhone = Boolean(phone.trim());
    const validAddress = Boolean(resolvedAddress);
    return validAmount && validNetwork && validPhone && validAddress;
  }, [amount, selectedNetwork, phone, resolvedAddress]);

  const startOnramp = async () => {
    setSubmitting(true);
    try {
      if (!NEDAPAY_API_KEY) {
        toast({
          title: 'Config Error',
          description: 'NEDAPAY API key is not configured.',
          variant: 'destructive',
        });
        return;
      }

      const res = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/pretium/onramp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': NEDAPAY_API_KEY,
        },
        body: JSON.stringify({
          currency_code: fiat,
          shortcode: phone.trim(),
          amount: Number(amount),
          mobile_network: selectedNetwork,
          chain: selectedChain,
          asset: selectedAsset,
          address: resolvedAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Deposit Failed',
          description: data.message || 'Failed to initiate deposit.',
          variant: 'destructive',
        });
        return;
      }

      const txCode = data?.data?.transaction_code;
      if (!txCode) {
        toast({
          title: 'Deposit Started',
          description: 'Prompt sent, but no transaction code returned.',
          variant: 'destructive',
        });
        return;
      }

      setTransactionCode(txCode);
      setCurrentStep(2);
      toast({
        title: 'Prompt Sent',
        description: 'Confirm the mobile money prompt on your phone.',
      });
    } catch (err: any) {
      toast({
        title: 'Deposit Failed',
        description: err?.message || 'Failed to initiate deposit.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pollStatus = useCallback(async () => {
    if (!transactionCode) return;

    setPolling(true);
    try {
      if (!NEDAPAY_API_KEY) {
        toast({
          title: 'Config Error',
          description: 'NEDAPAY API key is not configured.',
          variant: 'destructive',
        });
        return;
      }

      const res = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/pretium/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': NEDAPAY_API_KEY,
        },
        body: JSON.stringify({
          currency_code: fiat,
          transaction_code: transactionCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Status Error',
          description: data.message || 'Failed to fetch status.',
          variant: 'destructive',
        });
        return;
      }

      setStatus(data.data);

      const statusUpper = String(data?.data?.status || '').toUpperCase();
      if (statusUpper === 'COMPLETE' || statusUpper === 'COMPLETED' || statusUpper === 'SUCCESS') {
        toast({
          title: 'Deposit Completed',
          description: 'Your deposit has been processed.',
        });
      } else if (statusUpper === 'FAILED' || statusUpper === 'FAIL') {
        toast({
          title: 'Deposit Failed',
          description: data?.data?.message || 'Payment failed.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Status Error',
        description: err?.message || 'Failed to fetch status.',
        variant: 'destructive',
      });
    } finally {
      setPolling(false);
    }
  }, [fiat, toast, transactionCode]);

  useEffect(() => {
    if (currentStep === 2 && transactionCode) {
      const interval = setInterval(() => {
        pollStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentStep, transactionCode, pollStatus]);

  // Malawi P2P: delegate to RampaOnRampFlow with a currency switcher
  if (fiat === 'MWK') {
    return (
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="bg-[#EAE4DC] border border-[#C8C1B4] rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-[#7C7468] flex-shrink-0">Currency:</span>
          <Select value={fiat} onValueChange={(v) => setFiat(v as SupportedFiat)}>
            <SelectTrigger showIcon={false} className="h-auto px-2.5 py-1.5 bg-[#F0EBE3] border border-[#C8C1B4]/70 rounded-xl shadow-none focus:ring-0 flex-1">
              <SelectValue>
                <div className="flex items-center gap-1.5">
                  <img src={selectedFiatMeta.flag} alt={selectedFiatMeta.code} className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />
                  <span className="text-xs font-medium text-[#1C1917]">{selectedFiatMeta.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#7C7468] ml-1" />
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#F4EFE6] border border-[#C8C1B4] rounded-xl shadow-2xl">
              {FIAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.code} value={opt.code} className="text-[#1C1917] hover:bg-[#1C1917]/[0.04] focus:bg-[#1C1917]/[0.06] cursor-pointer rounded-lg transition-colors my-1 py-2">
                  <div className="flex items-center gap-1.5">
                    <img src={opt.flag} alt={opt.code} className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />
                    <span className="text-xs">{opt.label}</span>
                    {opt.p2p && <span className="text-[9px] bg-blue-500/20 text-blue-700 border border-blue-500/30 rounded px-1 py-0.5 ml-1">P2P</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <RampaOnRampFlow walletAddress={walletAddress} onBack={onBack} />
      </div>
    );
  }

  // Tanzania: either Native NTZS or Snaville P2P based on asset
  if (fiat === 'TZS') {
    const assetStr = String(selectedAsset || '').toUpperCase();
    if (assetStr === 'NTZS') {
      return (
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="bg-[#EAE4DC] border border-[#C8C1B4] rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-[#7C7468] flex-shrink-0">Currency:</span>
            <Select value={fiat} onValueChange={(v) => setFiat(v as SupportedFiat)}>
              <SelectTrigger showIcon={false} className="h-auto px-2.5 py-1.5 bg-[#F0EBE3] border border-[#C8C1B4]/70 rounded-xl shadow-none focus:ring-0 flex-1">
                <SelectValue>
                  <div className="flex items-center gap-1.5">
                    <img src={selectedFiatMeta.flag} alt={selectedFiatMeta.code} className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />
                    <span className="text-xs font-medium text-[#1C1917]">{selectedFiatMeta.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-[#9B9188] ml-1" />
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#F4EFE6] backdrop-blur-xl border border-[#C8C1B4] rounded-xl shadow-2xl">
                {FIAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.code} value={opt.code} className="text-[#1C1917] hover:bg-[#1C1917]/[0.04] focus:bg-[#1C1917]/[0.06] cursor-pointer rounded-lg transition-colors my-1 py-2">
                    <div className="flex items-center gap-1.5">
                      <img src={opt.flag} alt={opt.code} className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />
                      <span className="text-xs">{opt.label}</span>
                      {opt.p2p && <span className="text-[9px] bg-green-500/20 text-green-300 border border-green-500/30 rounded px-1 py-0.5 ml-1">P2P</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs text-[#7C7468] ml-2 border-l border-[#C8C1B4] pl-3 flex-shrink-0">Asset:</span>
            <Select value={selectedAsset} onValueChange={(v) => setSelectedAsset(v as PretiumAsset)}>
              <SelectTrigger showIcon={false} className="h-auto px-2.5 py-1.5 bg-[#F0EBE3] border border-[#C8C1B4]/70 rounded-xl shadow-none focus:ring-0 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#F4EFE6] backdrop-blur-xl border border-[#C8C1B4] rounded-xl shadow-2xl">
                {availableAssets.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-[#1C1917] hover:bg-[#1C1917]/[0.04] focus:bg-[#1C1917]/[0.06] cursor-pointer rounded-lg transition-colors my-1 py-2">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NtzsOnRampFlow walletAddress={walletAddress} onBack={onBack} />
        </div>
      );
    }
    return (
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="bg-[#EAE4DC] border border-[#C8C1B4] rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-[#7C7468] flex-shrink-0">Currency:</span>
          <Select value={fiat} onValueChange={(v) => setFiat(v as SupportedFiat)}>
            <SelectTrigger showIcon={false} className="h-auto px-2.5 py-1.5 bg-[#F0EBE3] border border-[#C8C1B4]/70 rounded-xl shadow-none focus:ring-0 flex-1">
              <SelectValue>
                <div className="flex items-center gap-1.5">
                  <img src={selectedFiatMeta.flag} alt={selectedFiatMeta.code} className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />
                  <span className="text-xs font-medium text-[#1C1917]">{selectedFiatMeta.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#7C7468] ml-1" />
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#F4EFE6] border border-[#C8C1B4] rounded-xl shadow-2xl">
              {FIAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.code} value={opt.code} className="text-[#1C1917] hover:bg-[#1C1917]/[0.04] focus:bg-[#1C1917]/[0.06] cursor-pointer rounded-lg transition-colors my-1 py-2">
                  <div className="flex items-center gap-1.5">
                    <img src={opt.flag} alt={opt.code} className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />
                    <span className="text-xs">{opt.label}</span>
                    {opt.p2p && <span className="text-[9px] bg-green-500/20 text-green-700 border border-green-500/30 rounded px-1 py-0.5 ml-1">P2P</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-[#7C7468] ml-2 border-l border-[#C8C1B4] pl-3 flex-shrink-0">Asset:</span>
          <Select value={selectedAsset} onValueChange={(v) => setSelectedAsset(v as PretiumAsset)}>
            <SelectTrigger showIcon={false} className="h-auto px-2.5 py-1.5 bg-[#F0EBE3] border border-[#C8C1B4]/70 rounded-xl shadow-none focus:ring-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#F4EFE6] border border-[#C8C1B4] rounded-xl shadow-2xl">
              {availableAssets.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-[#1C1917] hover:bg-[#1C1917]/[0.04] focus:bg-[#1C1917]/[0.06] cursor-pointer rounded-lg transition-colors my-1 py-2">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SnavilleOnRampFlow walletAddress={walletAddress} onBack={onBack} />
      </div>
    );
  }

  // When parent provides initial values, render a stripped form (no Card wrapper, no redundant fields)
  const isEmbedded = !!initialFiat && !!initialAmount;

  // Shared step-2 status block (used in both embedded and standalone modes)
  const renderStep2 = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-[#7C7468] hover:text-[#1C1917] transition-colors group">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-xs font-medium">Back</span>
        </button>
      )}
      <div className="bg-[#F4EFE6] rounded-2xl p-4 border border-[#D4CEBE]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium text-[#7C7468]">Transaction ID</p>
            <p className="text-xs font-mono text-[#1C1917] mt-0.5 break-all">{transactionCode}</p>
          </div>
          <div className={`px-2 py-1 rounded-full text-[10px] font-medium border flex items-center gap-1 ${statusTone === 'success' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700' : statusTone === 'failed' ? 'bg-red-500/15 border-red-500/40 text-red-700' : 'bg-amber-500/15 border-amber-500/40 text-amber-700'}`}>
            {statusTone === 'success' ? <CheckCircle2 className="w-3 h-3" /> : statusTone === 'failed' ? <XCircle className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
            <span>{status?.status || 'PENDING'}</span>
          </div>
        </div>
        <div className="mt-4 bg-[#EDE8DF] border border-[#C8C1B4]/60 rounded-xl p-3">
          <p className="text-[10px] text-[#7C7468] font-medium">NEXT STEPS</p>
          <p className="text-xs text-[#1C1917] mt-1 leading-relaxed">Check your phone for a mobile money prompt and confirm the payment. The status will update automatically.</p>
          {status?.message && <p className="text-[10px] text-[#7C7468] mt-2 italic">{status.message}</p>}
        </div>
      </div>
      <Button onClick={pollStatus} disabled={polling} className="w-full h-12 bg-[#E8E2D9] hover:bg-[#E4DDD3] text-[#1C1917] font-medium border border-[#C8C1B4] rounded-xl transition-all">
        <span className="flex items-center justify-center gap-2">
          {polling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Refresh Status
        </span>
      </Button>
    </motion.div>
  );

  if (isEmbedded) {
    if (currentStep === 2 && transactionCode) return renderStep2();

    return (
      <div className="space-y-3">
        {/* Compact summary — read-only, shows what was selected in step 1 */}
        <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-4">
          <div className="text-[11px] font-medium text-[#7C7468] mb-3">Payment details</div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#1C1917] text-xl font-bold">{amount} {selectedAsset}</p>
              <p className="text-[#7C7468] text-xs mt-0.5">
                {loadingRate ? 'Loading rate…' : quotedRate ? `≈ ${(parseFloat(amount || '0') * quotedRate).toFixed(2)} ${fiat}` : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#7C7468]">Rate</div>
              <div className="text-xs font-medium text-[#1C1917]">
                {loadingRate ? '…' : quotedRate ? `1 ${selectedAsset} = ${quotedRate.toFixed(2)} ${fiat}` : 'Unavailable'}
              </div>
            </div>
          </div>
        </div>

        {/* Account details — network + phone */}
        <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-4 space-y-4">
          <div className="text-[11px] font-medium text-[#7C7468]">Account details</div>

          <div>
            <span className="text-xs font-semibold text-[#1C1917] block mb-2">Mobile Network</span>
            <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
              <SelectTrigger showIcon={false} className="w-full h-12 px-3 bg-[#EDE8DF] border border-[#C8C1B4]/70 rounded-xl shadow-none focus:ring-0">
                <SelectValue>
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="text-sm font-medium text-[#1C1917] truncate flex-1 min-w-0">
                      {selectedNetwork || (loadingNetworks ? 'Loading…' : 'Select network')}
                    </span>
                    <ChevronDown className="h-4 w-4 text-[#7C7468] flex-shrink-0" />
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#F4EFE6] border border-[#C8C1B4] rounded-xl shadow-2xl">
                {networks.map((n) => (
                  <SelectItem key={n.code} value={n.code} className="text-[#1C1917] hover:bg-[#1C1917]/[0.04] focus:bg-[#1C1917]/[0.06] cursor-pointer rounded-lg transition-colors my-1 py-2">
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <span className="text-xs font-semibold text-[#1C1917] block mb-2">Phone Number</span>
            <Input
              type="tel"
              placeholder="e.g., 0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-12 px-3 bg-[#EDE8DF] border border-[#C8C1B4]/70 rounded-xl text-[#1C1917] text-sm placeholder:text-[#9B9188] focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
            />
          </div>
        </div>

        {/* Wallet address */}
        <div className="bg-[#EDE8DF] border border-[#C8C1B4]/70 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-[#7C7468] block">Receive address ({selectedChain})</span>
            <p className="text-[10px] text-[#1C1917] truncate font-mono">{resolvedAddress || 'No wallet address'}</p>
          </div>
          {resolvedAddress && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
        </div>
        {!resolvedAddress && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            <p className="text-amber-700 text-[10px]">Wallet address not found. Please connect a wallet.</p>
          </div>
        )}

        <Button
          onClick={startOnramp}
          disabled={!isValidStep1 || submitting}
          className="w-full h-14 bg-[#1C1917] hover:bg-[#2C2927] text-white font-semibold rounded-2xl shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span className="flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing…</span></> : 'Confirm Payment'}
          </span>
        </Button>
      </div>
    );
  }

  // ── Standalone mode (no initial values from parent) ────────────────────
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-gradient-to-br from-[#F4EFE6] to-[#E2D9C8] ring-1 ring-inset ring-black/[0.03] shadow-[0_4px_20px_rgba(0,0,0,0.06)] !rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 sm:pb-6 pt-5 sm:pt-7 px-4 sm:px-7">
          <CardDescription className="text-[#7C7468] text-xs mt-2 text-center">
            {currentStep === 1 ? 'Enter payment details and confirm' : 'Confirm transaction on your phone'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-7 pb-5 sm:pb-7">
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-6 h-6 rounded-full text-[10px] font-medium flex items-center justify-center border transition-colors ${currentStep >= step ? 'bg-[#1C1917]/10 border-[#1C1917]/30 text-[#1C1917]' : 'bg-[#E8E2D9] border-[#C8C1B4] text-[#9B9188]'}`}>
                  {step}
                </div>
                {step < 2 && <div className={`w-6 h-px mx-1 transition-colors ${currentStep > step ? 'bg-[#1C1917]/30' : 'bg-[#C8C1B4]/60'}`} />}
              </div>
            ))}
          </div>

          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} className="space-y-4">
              {/* Payment Details */}
              <div className="bg-[#F4EFE6] rounded-2xl p-4 border border-[#D4CEBE]">
                <span className="text-xs font-medium text-[#7C7468] block mb-3">Payment Details</span>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-[#7C7468]">Currency</span>
                      <Select value={fiat} onValueChange={(v) => setFiat(v as SupportedFiat)}>
                        <SelectTrigger showIcon={false} className="w-full h-auto px-2.5 py-2 bg-[#F0EBE3] border border-[#C8C1B4]/70 rounded-xl shadow-none focus:ring-0">
                          <SelectValue>
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <img src={selectedFiatMeta.flag} alt={selectedFiatMeta.code} className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />
                                <span className="text-xs font-medium text-[#1C1917] truncate">{selectedFiatMeta.label}</span>
                              </div>
                              <ChevronDown className="h-3.5 w-3.5 text-[#7C7468] flex-shrink-0" />
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#F4EFE6] border border-[#C8C1B4] rounded-xl shadow-2xl">
                          {FIAT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.code} value={opt.code} className="text-[#1C1917] hover:bg-[#1C1917]/[0.04] focus:bg-[#1C1917]/[0.06] cursor-pointer rounded-lg transition-colors my-1 py-2">
                              <div className="flex items-center gap-1.5">
                                <img src={opt.flag} alt={opt.code} className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />
                                <span className="text-xs truncate">{opt.label}</span>
                                {opt.p2p && <span className="text-[9px] bg-green-500/20 text-green-700 border border-green-500/30 rounded px-1 py-0.5 ml-1">P2P</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-[#7C7468]">Rate</span>
                      <div className="h-auto px-2.5 py-2 bg-[#EDE8DF] border border-[#C8C1B4]/70 rounded-xl flex flex-col justify-center min-h-[38px]">
                        <p className="text-xs font-medium text-[#1C1917] truncate">{loadingRate ? 'Loading...' : quotedRate ? `1 ${selectedAsset} ≈ ${quotedRate.toFixed(2)} ${fiat}` : 'Unavailable'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-[#7C7468]">Stablecoin (Asset)</span>
                    <Select value={selectedAsset} onValueChange={(v) => setSelectedAsset(v as PretiumAsset)}>
                      <SelectTrigger showIcon={false} className="w-full h-auto px-2.5 py-2 bg-[#F0EBE3] border border-[#C8C1B4]/70 rounded-xl shadow-none focus:ring-0">
                        <SelectValue>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="text-xs font-medium text-[#1C1917] truncate flex-1 min-w-0">{selectedAsset}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-[#7C7468] flex-shrink-0" />
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#F4EFE6] border border-[#C8C1B4] rounded-xl shadow-2xl">
                        {availableAssets.map((opt) => (
                          <SelectItem key={opt} value={opt} className="text-[#1C1917] hover:bg-[#1C1917]/[0.04] focus:bg-[#1C1917]/[0.06] cursor-pointer rounded-lg transition-colors my-1 py-2">{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-[#7C7468]">Amount to Pay ({fiat})</span>
                    <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#F0EBE3] border border-[#C8C1B4]/70 rounded-xl text-[#1C1917] text-xs placeholder:text-[#9B9188] focus:ring-2 focus:ring-blue-500/50 focus:border-transparent" />
                    {estimatedReceive !== null && <p className="text-[10px] text-[#7C7468] text-right">You receive ≈ {estimatedReceive.toFixed(2)} {asset}</p>}
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="bg-[#F4EFE6] rounded-2xl p-4 border border-[#D4CEBE]">
                <span className="text-xs font-medium text-[#7C7468] block mb-3">Account Details</span>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-[#7C7468]">Mobile Network</span>
                    <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                      <SelectTrigger showIcon={false} className="w-full h-auto px-2.5 py-2 bg-[#F0EBE3] border border-[#C8C1B4]/70 rounded-xl shadow-none focus:ring-0">
                        <SelectValue>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="text-xs font-medium text-[#1C1917] truncate flex-1 min-w-0">{selectedNetwork || (loadingNetworks ? 'Loading...' : 'Select Network')}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-[#7C7468] flex-shrink-0" />
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#F4EFE6] border border-[#C8C1B4] rounded-xl shadow-2xl">
                        {networks.map((n) => (
                          <SelectItem key={n.code} value={n.code} className="text-[#1C1917] hover:bg-[#1C1917]/[0.04] focus:bg-[#1C1917]/[0.06] cursor-pointer rounded-lg transition-colors my-1 py-2">{n.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-[#7C7468]">Phone Number</span>
                    <Input type="tel" placeholder="e.g., 0712345678" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#F0EBE3] border border-[#C8C1B4]/70 rounded-xl text-[#1C1917] text-xs placeholder:text-[#9B9188] focus:ring-2 focus:ring-blue-500/50 focus:border-transparent" />
                  </div>
                </div>
              </div>

              {/* Receive Address */}
              <div className="bg-[#F4EFE6] rounded-2xl p-4 border border-[#D4CEBE]">
                <span className="text-xs font-medium text-[#7C7468] block mb-3">Receive Address</span>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl border border-[#C8C1B4]/70 bg-[#EDE8DF]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#D4CEBE] flex-shrink-0" />
                        <div className="min-w-0"><span className="text-[10px] text-[#7C7468] block">Asset</span><span className="text-xs font-semibold text-[#1C1917] truncate">{selectedAsset}</span></div>
                      </div>
                    </div>
                    <Select value={selectedChain} onValueChange={(v) => setSelectedChain(v as PretiumOnrampChain)}>
                      <SelectTrigger showIcon={false} className="w-full h-full px-2.5 bg-[#F0EBE3] border border-[#C8C1B4]/70 rounded-xl shadow-none focus:ring-0">
                        <SelectValue>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="text-xs font-medium text-[#1C1917] truncate flex-1 min-w-0">{selectedChain}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-[#7C7468] flex-shrink-0" />
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#F4EFE6] border border-[#C8C1B4] rounded-xl shadow-2xl">
                        {chainOptions.map((c) => (
                          <SelectItem key={c} value={c} className="text-[#1C1917] hover:bg-[#1C1917]/[0.04] focus:bg-[#1C1917]/[0.06] cursor-pointer rounded-lg transition-colors my-1 py-2">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-2.5 rounded-xl border border-[#C8C1B4]/70 bg-[#EDE8DF] flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1"><span className="text-[10px] text-[#7C7468] block">Address</span><p className="text-[10px] text-[#1C1917] truncate font-mono">{resolvedAddress || 'No wallet address available'}</p></div>
                    {resolvedAddress && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                  </div>
                  {!resolvedAddress && <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3"><p className="text-amber-700 text-[10px]">Wallet address not found. Please connect a wallet.</p></div>}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {onBack && <Button onClick={onBack} variant="ghost" className="flex-1 h-12 text-[#7C7468] hover:text-[#1C1917] hover:bg-[#E8E2D9] rounded-xl">Back</Button>}
                <Button onClick={startOnramp} disabled={!isValidStep1 || submitting} className={`flex-[2] h-12 bg-[#1C1917] hover:bg-[#2C2927] text-white font-medium rounded-xl shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${!onBack ? 'w-full' : ''}`}>
                  <span className="flex items-center justify-center gap-2">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></> : 'Confirm Payment'}
                  </span>
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && transactionCode && renderStep2()}
        </CardContent>
      </Card>
    </div>
  );
}
