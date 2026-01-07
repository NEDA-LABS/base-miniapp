'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/compliance/user/components/ui/button';
import { Input } from '@/compliance/user/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/compliance/user/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/compliance/user/components/ui/card';
import { useToast } from '@/compliance/user/components/ui/use-toast';
import type { PretiumAsset, PretiumExchangeRateResponse, PretiumNetwork, PretiumStatusResponse } from '@/utils/pretium/types';
import { motion } from 'framer-motion';
import { stablecoins } from '@/data/stablecoins';

type SupportedFiat = 'KES' | 'MWK' | 'CDF' | 'GHS' | 'UGX';

const getCountryFlag = (countryCode: string): string => {
  const flags: Record<string, string> = {
    'GH': 'https://purecatamphetamine.github.io/country-flag-icons/3x2/GH.svg',
    'KE': 'https://purecatamphetamine.github.io/country-flag-icons/3x2/KE.svg',
    'MW': 'https://purecatamphetamine.github.io/country-flag-icons/3x2/MW.svg',
    'CD': 'https://purecatamphetamine.github.io/country-flag-icons/3x2/CD.svg',
    'UG': 'https://purecatamphetamine.github.io/country-flag-icons/3x2/UG.svg',
  };
  return flags[countryCode] || '';
};

const getTokenIcon = (symbol: string): string => {
  const token = stablecoins.find(s => s.baseToken.toUpperCase() === symbol.toUpperCase());
  return token?.flag || '/default-token-icon.png';
};

const FIAT_OPTIONS: Array<{ code: SupportedFiat; countryCode: string; label: string; flag: string }> = [
  { code: 'GHS', countryCode: 'GH', label: 'Ghana (GHS)', flag: getCountryFlag('GH') },
  { code: 'KES', countryCode: 'KE', label: 'Kenya (KES)', flag: getCountryFlag('KE') },
  { code: 'MWK', countryCode: 'MW', label: 'Malawi (MWK)', flag: getCountryFlag('MW') },
  { code: 'CDF', countryCode: 'CD', label: 'DR Congo (CDF)', flag: getCountryFlag('CD') },
  { code: 'UGX', countryCode: 'UG', label: 'Uganda (UGX)', flag: getCountryFlag('UG') },
];

const ASSET_OPTIONS: PretiumAsset[] = ['USDC', 'USDT'];

type PretiumOnrampChain = 'BASE' | 'POLYGON' | 'CELO' | 'SCROLL';

interface PretiumOnRampFlowProps {
  walletAddress?: string;
  asset: PretiumAsset;
  onBack?: () => void;
}

export default function PretiumOnRampFlow({ walletAddress, asset, onBack }: PretiumOnRampFlowProps) {
  // Mock auth token for now as per user request
  const getAccessToken = async () => '';
  const { toast } = useToast();

  // Step 1: Configuration & Details
  // Step 2: Processing & Status
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [fiat, setFiat] = useState<SupportedFiat>('GHS');
  const selectedFiatMeta = useMemo(() => FIAT_OPTIONS.find((f) => f.code === fiat)!, [fiat]);

  const [networks, setNetworks] = useState<PretiumNetwork[]>([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');

  const chainOptions = useMemo<PretiumOnrampChain[]>(() => {
    if (asset === 'USDC') return ['BASE', 'POLYGON', 'CELO'];
    return ['CELO', 'POLYGON', 'SCROLL'];
  }, [asset]);

  const [selectedChain, setSelectedChain] = useState<PretiumOnrampChain>(() => {
    return asset === 'USDC' ? 'BASE' : 'CELO';
  });

  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
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
      setLoadingNetworks(true);
      try {
        const res = await fetch(`/api/pretium/networks?country=${selectedFiatMeta.countryCode}`);
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
  }, [selectedFiatMeta.countryCode, toast]);

  useEffect(() => {
    const fetchRate = async () => {
      setLoadingRate(true);
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/pretium/exchange-rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
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
  }, [fiat, getAccessToken, toast]);

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
      const token = await getAccessToken();
      const res = await fetch('/api/pretium/onramp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currency_code: fiat,
          shortcode: phone.trim(),
          amount: Number(amount),
          mobile_network: selectedNetwork,
          chain: selectedChain,
          asset,
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
      const token = await getAccessToken();
      const res = await fetch('/api/pretium/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
  }, [fiat, getAccessToken, toast, transactionCode]);

  useEffect(() => {
    if (currentStep === 2 && transactionCode) {
      const interval = setInterval(() => {
        pollStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentStep, transactionCode, pollStatus]);

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/95 backdrop-blur-xl border border-slate-700/60 shadow-2xl !rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 sm:pb-6 pt-5 sm:pt-7 px-4 sm:px-7 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent">
          <CardDescription className="text-slate-400 text-xs mt-2 text-center">
            {currentStep === 1 ? 'Enter payment details and confirm' : 'Confirm transaction on your phone'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-7 pb-5 sm:pb-7">
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full text-[10px] font-medium flex items-center justify-center border transition-colors ${
                    currentStep >= step
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-500'
                  }`}
                >
                  {step}
                </div>
                {step < 2 && (
                  <div
                    className={`w-6 h-px mx-1 transition-colors ${
                      currentStep > step ? 'bg-purple-500/50' : 'bg-slate-700/50'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Payment Details Section */}
              <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40 hover:border-slate-500/50 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-medium text-slate-400">Payment Details</span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-slate-400">Currency</span>
                      <Select value={fiat} onValueChange={(v) => setFiat(v as SupportedFiat)}>
                        <SelectTrigger showIcon={false} className="w-full h-auto px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl shadow-none focus:ring-0">
                          <SelectValue>
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <img src={selectedFiatMeta.flag} alt={selectedFiatMeta.code} className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />
                                <span className="text-xs font-medium text-white truncate">{selectedFiatMeta.label}</span>
                              </div>
                              <ChevronDown className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-2xl">
                          {FIAT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.code} value={opt.code} className="text-white hover:bg-purple-500/10 focus:bg-purple-500/15 cursor-pointer rounded-lg transition-colors my-1 py-2">
                              <div className="flex items-center gap-1.5">
                                <img src={opt.flag} alt={opt.code} className="w-4 h-3 rounded-sm object-cover flex-shrink-0" />
                                <span className="text-xs truncate">{opt.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-medium text-slate-400">Rate</span>
                      <div className="h-auto px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl flex flex-col justify-center min-h-[38px]">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {loadingRate
                              ? 'Loading...'
                              : quotedRate
                              ? `1 ${asset} ≈ ${quotedRate.toFixed(2)} ${fiat}` 
                              : 'Unavailable'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-slate-400">Amount to Pay ({fiat})</span>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                    />
                    {estimatedReceive !== null && (
                      <p className="text-[10px] text-slate-400 text-right">
                        You receive ≈ {estimatedReceive.toFixed(2)} {asset}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Details Section */}
              <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40 hover:border-slate-500/50 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-medium text-slate-400">Account Details</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-slate-400">Mobile Network</span>
                    <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                      <SelectTrigger showIcon={false} className="w-full h-auto px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl shadow-none focus:ring-0">
                        <SelectValue>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="text-xs font-medium text-white truncate flex-1 min-w-0">{selectedNetwork || (loadingNetworks ? 'Loading...' : 'Select Network')}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-2xl">
                        {networks.map((n) => (
                          <SelectItem key={n.code} value={n.code} className="text-white hover:bg-purple-500/10 focus:bg-purple-500/15 cursor-pointer rounded-lg transition-colors my-1 py-2">
                            {n.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-slate-400">Phone Number</span>
                    <Input
                      type="tel"
                      placeholder="e.g., 0712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Receive Address Section */}
              <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40 hover:border-slate-500/50 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-medium text-slate-400">Receive Address</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/30">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10 flex-shrink-0">
                          <img 
                            src={getTokenIcon(asset)} 
                            alt={asset}
                            className="w-3 h-3 object-cover rounded-full"
                            onError={(e) => {
                              e.currentTarget.src = '/default-token-icon.png';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">Asset</span>
                          <span className="text-xs font-semibold text-white truncate">{asset}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Select value={selectedChain} onValueChange={(v) => setSelectedChain(v as PretiumOnrampChain)}>
                        <SelectTrigger showIcon={false} className="w-full h-full px-2.5 bg-slate-900/30 border border-slate-700/60 rounded-xl shadow-none focus:ring-0">
                          <SelectValue>
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className="text-xs font-medium text-white truncate flex-1 min-w-0">{selectedChain}</span>
                              <ChevronDown className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-2xl">
                          {chainOptions.map((c) => (
                            <SelectItem key={c} value={c} className="text-white hover:bg-purple-500/10 focus:bg-purple-500/15 cursor-pointer rounded-lg transition-colors my-1 py-2">
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/30 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 block">Address</span>
                      <p className="text-[10px] text-slate-200 truncate font-mono">{resolvedAddress || 'No wallet address available'}</p>
                    </div>
                    {resolvedAddress && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                  </div>

                  {!resolvedAddress && (
                    <div className="bg-amber-900/20 border border-amber-500/50 rounded-xl p-3">
                      <p className="text-amber-200/80 text-[10px]">
                        Wallet address not found. Please connect a wallet.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {onBack && (
                  <Button
                    onClick={onBack}
                    variant="ghost"
                    className="flex-1 h-12 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl"
                  >
                    Back
                  </Button>
                )}
                <Button
                  onClick={startOnramp}
                  disabled={!isValidStep1 || submitting}
                  className={`flex-[2] h-12 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${!onBack ? 'w-full' : ''}`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      'Confirm Payment'
                    )}
                  </span>
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && transactionCode && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {onBack && (
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
                  <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-xs font-medium">Back to dashboard</span>
                </button>
              )}

              <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-slate-400">Transaction ID</p>
                    <p className="text-xs font-mono text-white mt-0.5 break-all">{transactionCode}</p>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-[10px] font-medium border flex items-center gap-1 ${
                      statusTone === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        : statusTone === 'failed'
                        ? 'bg-red-500/15 border-red-500/40 text-red-200'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    {statusTone === 'success' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : statusTone === 'failed' ? (
                      <XCircle className="w-3 h-3" />
                    ) : (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    <span>{status?.status || 'PENDING'}</span>
                  </div>
                </div>

                <div className="mt-4 bg-slate-900/30 border border-slate-700/60 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-medium">NEXT STEPS</p>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                    Check your phone for a mobile money prompt and confirm the payment. The status will update automatically.
                  </p>
                  {status?.message && <p className="text-[10px] text-slate-400 mt-2 italic">{status.message}</p>}
                </div>
              </div>

              <Button
                onClick={pollStatus}
                disabled={polling}
                className="w-full h-12 bg-slate-800/70 hover:bg-slate-800 text-white font-medium border border-slate-700/60 rounded-xl transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  {polling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Refresh Status
                </span>
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
