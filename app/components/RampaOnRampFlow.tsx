'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Copy, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface RampaPaymentMethod {
    id: string;
    provider: string;
    account_number?: string;
    account_name?: string;
    instructions?: string;
}

interface RampaBuyOrder {
    order_number: string;
    status: string;
    amount_crypto: number;
    crypto_type?: string;
    amount_fiat: number;
    currency?: string;
    network?: string;
    payment_instructions: {
        provider: string;
        payment_type?: string;
        agent_code?: string;
        account_number?: string;
        account_name: string;
        amount_to_send: number;
        instructions: string;
    };
    expires_at: string;
}

type RampaOrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

const NEDAPAY_API_BASE = 'https://api.nedapay.xyz';
const NEDAPAY_API_KEY = process.env.NEXT_PUBLIC_NEDAPAY_API_KEY;

interface RampaOnRampFlowProps {
    walletAddress?: string;
    onBack?: () => void;
    variant?: 'full' | 'embedded';
}

export default function RampaOnRampFlow({
    walletAddress,
    onBack,
    variant = 'full',
}: RampaOnRampFlowProps) {
    const { toast } = useToast();

    // Steps: 1=Amount, 2=Details, 3=Instructions, 4=Status
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

    // Token/Network selection
    const [selectedToken, setSelectedToken] = useState<'USDT' | 'USDC'>('USDT');
    const selectedNetwork = selectedToken === 'USDC' ? 'BASE' : 'BEP20';
    const networkLabel = selectedToken === 'USDC' ? 'Base' : 'BSC (BEP20)';

    const [buyRate, setBuyRate] = useState<number | null>(null);
    const [minUsdt, setMinUsdt] = useState(1);
    const [maxUsdt, setMaxUsdt] = useState(10000);
    const [loadingRates, setLoadingRates] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState<RampaPaymentMethod[]>([]);
    const [loadingMethods, setLoadingMethods] = useState(true);

    const [amountUsdt, setAmountUsdt] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [transactionId, setTransactionId] = useState('');

    const [order, setOrder] = useState<RampaBuyOrder | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [polling, setPolling] = useState(false);
    const [orderStatus, setOrderStatus] = useState<RampaOrderStatus | null>(null);
    const [createOrderError, setCreateOrderError] = useState('');

    const resolvedAddress = walletAddress || '';

    // Fetch Rates
    useEffect(() => {
        const fetchRates = async () => {
            if (!NEDAPAY_API_KEY) return;
            setLoadingRates(true);
            try {
                const res = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/rampa/rates`, {
                    headers: { 'x-api-key': NEDAPAY_API_KEY },
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    // Try different possible field names from backend/service variations
                    const rate = data.rates?.buy_rate_usdt || data.rates?.buy_rate;
                    setBuyRate(rate ?? null);

                    const min = data.limits?.min_usdt || data.limits?.min || 1;
                    const max = data.limits?.max_usdt || data.limits?.max || 10000;
                    setMinUsdt(min);
                    setMaxUsdt(max);
                }
            } catch { /* silent */ } finally {
                setLoadingRates(false);
            }
        };
        fetchRates();
    }, []);

    // Fetch Payment Methods
    useEffect(() => {
        const fetchMethods = async () => {
            if (!NEDAPAY_API_KEY) return;
            setLoadingMethods(true);
            try {
                const res = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/rampa/payment-methods`, {
                    headers: { 'x-api-key': NEDAPAY_API_KEY },
                });
                const data = await res.json();
                if (res.ok && Array.isArray(data.payment_methods)) {
                    // Map name to provider if needed to match frontend expectation
                    const methods = data.payment_methods.map((m: any) => ({
                        ...m,
                        provider: m.provider || m.name // Handle backend 'name' vs frontend 'provider'
                    }));
                    setPaymentMethods(methods);
                    if (methods.length > 0) setSelectedMethodId(methods[0].id);
                }
            } catch {
                toast({ title: 'Error', description: 'Failed to load payment methods.', variant: 'destructive' });
            } finally {
                setLoadingMethods(false);
            }
        };
        fetchMethods();
    }, [toast]);

    const amountMwk = useMemo(() => {
        const usdt = Number(amountUsdt);
        if (!Number.isFinite(usdt) || usdt <= 0 || !buyRate) return null;
        return Math.round(usdt * buyRate);
    }, [amountUsdt, buyRate]);

    const isAmountValid = useMemo(() => {
        const usdt = Number(amountUsdt);
        return buyRate !== null && Number.isFinite(usdt) && usdt >= minUsdt && usdt <= maxUsdt;
    }, [amountUsdt, buyRate, minUsdt, maxUsdt]);

    const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId) || null;
    const canProceed = isAmountValid && Boolean(fullName.trim()) && Boolean(phone.trim()) && Boolean(selectedMethodId) && Boolean(resolvedAddress);

    const statusTone = useMemo(() => {
        if (orderStatus === 'COMPLETED') return 'success';
        if (orderStatus === 'FAILED' || orderStatus === 'EXPIRED' || orderStatus === 'CANCELLED') return 'failed';
        return 'pending';
    }, [orderStatus]);

    const getStatusBg = (s: RampaOrderStatus | null) => {
        if (s === 'COMPLETED') return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
        if (s === 'FAILED' || s === 'EXPIRED' || s === 'CANCELLED') return 'bg-red-500/15 border-red-500/40 text-red-300';
        return 'bg-blue-500/15 border-blue-500/40 text-blue-300';
    };

    const handleCreateOrder = async () => {
        setCreateOrderError('');
        if (!resolvedAddress) {
            setCreateOrderError('Wallet address not available');
            toast({ title: 'Error', description: 'Wallet address not available', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            if (!NEDAPAY_API_KEY) {
                toast({ title: 'Config Error', description: 'API Key missing', variant: 'destructive' });
                return;
            }
            const res = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/rampa/onramp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': NEDAPAY_API_KEY },
                body: JSON.stringify({
                    amount_usdt: Number(amountUsdt),
                    destination_address: resolvedAddress,
                    payment_method_id: selectedMethodId,
                    user_full_name: fullName.trim(),
                    user_phone: phone.trim(),
                    network: selectedNetwork,
                    token: selectedToken,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                const msg = data.error || 'Failed to create order';
                setCreateOrderError(msg);
                toast({ title: 'Order Failed', description: msg, variant: 'destructive' });
                return;
            }
            setOrder(data.order);
            setCurrentStep(3);
            toast({ title: 'Order Created', description: 'Please send the exact MWK amount to the account shown.' });
        } catch (err: any) {
            const msg = err?.message || 'Failed to create order';
            setCreateOrderError(msg);
            toast({ title: 'Order Failed', description: msg, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyPayment = async () => {
        if (!order || !transactionId.trim()) {
            toast({ title: 'Error', description: 'Please enter the mobile money transaction ID', variant: 'destructive' });
            return;
        }
        setVerifying(true);
        try {
            if (!NEDAPAY_API_KEY) return;
            const res = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/rampa/onramp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': NEDAPAY_API_KEY },
                body: JSON.stringify({ order_number: order.order_number, transaction_id: transactionId.trim() }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                toast({ title: 'Verification Failed', description: data.error || 'Failed to verify payment', variant: 'destructive' });
                return;
            }
            setCurrentStep(4);
            setOrderStatus('PROCESSING');
            toast({ title: 'Payment Submitted', description: 'Your payment is being verified.' });
        } catch (err: any) {
            toast({ title: 'Verification Failed', description: err?.message || 'Failed to verify payment', variant: 'destructive' });
        } finally {
            setVerifying(false);
        }
    };

    const pollOrderStatus = useCallback(async () => {
        if (!order) return;
        setPolling(true);
        try {
            if (!NEDAPAY_API_KEY) return;
            const res = await fetch(`${NEDAPAY_API_BASE}/api/v1/ramp/rampa/orders/${order.order_number}`, {
                headers: { 'x-api-key': NEDAPAY_API_KEY },
            });
            const data = await res.json();
            if (res.ok && data.order?.status) {
                const s = data.order.status as RampaOrderStatus;
                setOrderStatus(s);
                if (s === 'COMPLETED') toast({ title: 'Success!', description: `Your ${selectedToken} has been sent to your wallet.` });
                else if (s === 'FAILED') toast({ title: 'Order Failed', description: 'Payment verification failed.', variant: 'destructive' });
            }
        } catch { /* silent */ } finally {
            setPolling(false);
        }
    }, [order, toast]);

    useEffect(() => {
        if (currentStep !== 4 || !order) return;
        const interval = setInterval(() => {
            if (orderStatus !== 'COMPLETED' && orderStatus !== 'FAILED') pollOrderStatus();
        }, 5000);
        return () => clearInterval(interval);
    }, [currentStep, order, orderStatus, pollOrderStatus]);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied', description: `${label} copied to clipboard` });
    };

    const CTA = ({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) => (
        <div className="relative overflow-hidden rounded-2xl p-[1px] bg-[linear-gradient(135deg,rgba(59,130,246,0.30),rgba(125,211,252,0.18),rgba(59,130,246,0.30))] shadow-[0_0_26px_rgba(59,130,246,0.18),0_20px_46px_rgba(0,0,0,0.35)]">
            <Button onClick={onClick} disabled={disabled} className="relative w-full h-12 overflow-hidden bg-[#070B12] text-white hover:bg-[#050912] font-semibold text-sm border-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-18px_38px_rgba(0,0,0,0.55)] rounded-[calc(1rem-1px)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:ring-0">
                <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.12),transparent_55%)] opacity-[0.55]" />
            </Button>
        </div>
    );

    const TOTAL_STEPS = 4;

    return (
        <div className="space-y-4">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-2">
                {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center">
                        <div className={`w-6 h-6 rounded-full text-[10px] font-medium flex items-center justify-center border transition-colors ${currentStep >= step ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' : 'bg-foreground/5 border-border/40 text-muted-foreground'}`}>
                            {step}
                        </div>
                        {step < TOTAL_STEPS && <div className={`w-6 h-px mx-1 transition-colors ${currentStep > step ? 'bg-blue-500/50' : 'bg-border/40'}`} />}
                    </div>
                ))}
            </div>

            {/* Step 1: Amount */}
            {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
                    <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-medium text-slate-400">Exchange Rate (MWK)</span>
                            {loadingRates && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                        </div>
                        <div className="grid grid-cols-2 gap-3 relative">
                            {loadingRates && (
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10 border border-blue-500/20">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                        <span className="text-[10px] font-medium text-blue-200">Fetching rates...</span>
                                    </div>
                                </div>
                            )}
                            <div className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/30">
                                <span className="text-[10px] text-slate-400 block">Buy Rate</span>
                                <span className="text-xs font-semibold text-white">{buyRate ? `1 USDT ≈ ${buyRate.toLocaleString()} MWK` : '—'}</span>
                            </div>
                            <div className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/30">
                                <span className="text-[10px] text-slate-400 block">Limits</span>
                                <span className="text-xs font-semibold text-white">{buyRate ? `${minUsdt}–${maxUsdt} USDT` : '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Token Selector */}
                    <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40">
                        <span className="text-xs font-medium text-slate-400 block mb-3">Receive Token</span>
                        <div className="grid grid-cols-2 gap-2">
                            {(['USDT', 'USDC'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setSelectedToken(t)}
                                    className={cn(
                                        'flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all',
                                        selectedToken === t
                                            ? 'bg-blue-600/20 border-blue-500/40 text-white'
                                            : 'bg-slate-900/30 border-slate-700/60 text-slate-400 hover:border-slate-600'
                                    )}
                                >
                                    <span>{t}</span>
                                    <span className="text-[9px] text-slate-500 font-normal">{t === 'USDC' ? 'Base' : 'BEP20'}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40">
                        <span className="text-xs font-medium text-slate-400 block mb-3">Amount to Receive ({selectedToken})</span>
                        <Input
                            type="number"
                            placeholder={`Min ${minUsdt} USD`}
                            value={amountUsdt}
                            onChange={(e) => setAmountUsdt(e.target.value)}
                            className="w-full px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                        />
                        {amountMwk !== null && (
                            <p className="text-[10px] text-slate-400 text-right mt-1">You send ≈ {Number(amountMwk).toLocaleString()} MWK</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        {onBack && <Button onClick={onBack} variant="ghost" className="flex-1 h-12 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl">Back</Button>}
                        <div className="flex-[2]">
                            <CTA onClick={() => isAmountValid && setCurrentStep(2)} disabled={!isAmountValid}>
                                Continue
                            </CTA>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Step 2: Payment Details */}
            {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
                    <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40 space-y-3">
                        <span className="text-xs font-medium text-slate-400 block">Mobile Money Provider</span>
                        <div className="grid gap-2">
                            {loadingMethods ? (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/30 border border-slate-700/60">
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                    <span className="text-xs text-slate-400">Loading providers...</span>
                                </div>
                            ) : (
                                paymentMethods.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedMethodId(m.id)}
                                        className={cn(
                                            'flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all',
                                            selectedMethodId === m.id
                                                ? 'bg-blue-600/20 border-blue-500/40 text-white'
                                                : 'bg-slate-900/30 border-slate-700/60 text-slate-300 hover:border-slate-600/60'
                                        )}
                                    >
                                        <div className={cn('p-1.5 rounded-lg', selectedMethodId === m.id ? 'bg-blue-500/20' : 'bg-slate-700/60')}>
                                            <Smartphone className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate">{m.provider}</p>
                                            {m.account_number && <p className="text-[10px] text-slate-400 truncate">{m.account_number}</p>}
                                        </div>
                                        {selectedMethodId === m.id && <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40 space-y-3">
                        <span className="text-xs font-medium text-slate-400 block">Your Details</span>
                        <div className="space-y-2">
                            <span className="text-xs font-medium text-slate-400">Full Name (as on Mobile Money)</span>
                            <Input type="text" placeholder="e.g., John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent" />
                        </div>
                        <div className="space-y-2">
                            <span className="text-xs font-medium text-slate-400">Phone Number</span>
                            <Input type="tel" placeholder="e.g., 0881234567" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent" />
                        </div>
                    </div>

                    <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40">
                        <span className="text-xs font-medium text-slate-400 block mb-2">Receive Address ({networkLabel})</span>
                        <div className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/30 flex items-center justify-between gap-2">
                            <p className="text-[10px] text-slate-200 truncate font-mono flex-1">{resolvedAddress || 'No wallet address available'}</p>
                            {resolvedAddress && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                        </div>
                        {!resolvedAddress && (
                            <div className="bg-amber-900/20 border border-amber-500/50 rounded-xl p-3 mt-2">
                                <p className="text-amber-200/80 text-[10px]">Wallet address not found. Please connect a wallet.</p>
                            </div>
                        )}
                    </div>

                    {/* Order summary */}
                    <div className="bg-slate-900/40 rounded-2xl p-3 border border-slate-700/40 space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">You pay</span>
                            <span className="text-white font-semibold">{amountMwk ? `${Number(amountMwk).toLocaleString()} MWK` : '—'}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">You receive</span>
                            <span className="text-emerald-400 font-semibold">{amountUsdt ? `${Number(amountUsdt).toFixed(2)} ${selectedToken}` : '—'}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Network</span>
                            <span className="text-slate-300">{networkLabel}</span>
                        </div>
                    </div>

                    {createOrderError && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-red-200">{createOrderError}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button onClick={() => setCurrentStep(1)} variant="ghost" className="flex-1 h-12 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl">Back</Button>
                        <div className="flex-[2]">
                            <CTA onClick={handleCreateOrder} disabled={!canProceed || submitting}>
                                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating Order...</span></> : 'Create Order'}
                            </CTA>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Step 3: Payment Instructions */}
            {currentStep === 3 && order && (
                <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
                    <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                                <p className="text-[10px] font-medium text-slate-400">Order Number</p>
                                <p className="text-xs font-mono text-white mt-0.5">{order.order_number}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-medium text-slate-400">You Receive</p>
                                <p className="text-sm font-bold text-emerald-400">{order.amount_crypto} {selectedToken}</p>
                            </div>
                        </div>
                        {order.expires_at && (
                            <p className="text-[10px] text-amber-400">Expires: {new Date(order.expires_at).toLocaleTimeString()}</p>
                        )}
                    </div>

                    <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40 space-y-3">
                        <span className="text-xs font-medium text-slate-400 block">Send Payment To</span>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/30">
                                <div><p className="text-[10px] text-slate-400">Provider</p><p className="text-xs font-semibold text-white">{order.payment_instructions.provider}</p></div>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/30">
                                <div className="min-w-0 flex-1"><p className="text-[10px] text-slate-400">Account Number</p><p className="text-xs font-semibold text-white font-mono">{order.payment_instructions.agent_code || order.payment_instructions.account_number || ''}</p></div>
                                <button onClick={() => copyToClipboard(order.payment_instructions.agent_code || order.payment_instructions.account_number || '', 'Account number')} className="ml-2 p-1.5 rounded-lg hover:bg-slate-700/60 transition-colors flex-shrink-0"><Copy className="w-3.5 h-3.5 text-slate-400" /></button>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/30">
                                <div><p className="text-[10px] text-slate-400">Account Name</p><p className="text-xs font-semibold text-white">{order.payment_instructions.account_name}</p></div>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10">
                                <div className="min-w-0 flex-1"><p className="text-[10px] text-amber-400">Amount to Send (MWK)</p><p className="text-sm font-bold text-amber-300">{order.amount_fiat.toLocaleString()} MWK</p></div>
                                <button onClick={() => copyToClipboard(order.amount_fiat.toString(), 'Amount')} className="ml-2 p-1.5 rounded-lg hover:bg-amber-500/20 transition-colors flex-shrink-0"><Copy className="w-3.5 h-3.5 text-amber-400" /></button>
                            </div>
                        </div>
                        <div className="bg-slate-900/30 border border-slate-700/60 rounded-xl p-3">
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">Instructions</p>
                            <p className="text-xs text-slate-200 mt-1 leading-relaxed">{order.payment_instructions.instructions}</p>
                        </div>
                    </div>

                    <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40 space-y-3">
                        <span className="text-xs font-medium text-slate-400 block">Mobile Money Transaction ID</span>
                        <Input type="text" placeholder="e.g., MPAMBA123XYZ" value={transactionId} onChange={(e) => setTransactionId(e.target.value.toUpperCase())} className="w-full px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent" />
                        <p className="text-[10px] text-slate-500">Find this in your mobile money SMS confirmation after sending.</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button onClick={() => setCurrentStep(2)} variant="ghost" className="flex-1 h-12 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl">Back</Button>
                        <div className="flex-[2]">
                            <CTA onClick={handleVerifyPayment} disabled={!transactionId.trim() || verifying}>
                                {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying...</span></> : 'I Have Sent the Payment'}
                            </CTA>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Step 4: Status */}
            {currentStep === 4 && order && (
                <motion.div key="step4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
                    <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-medium text-slate-400">Order Number</p>
                                <p className="text-xs font-mono text-white mt-0.5 break-all">{order.order_number}</p>
                            </div>
                            <div className={cn('px-2 py-1 rounded-full text-[10px] font-medium border flex items-center gap-1', getStatusBg(orderStatus))}>
                                {statusTone === 'success' ? <CheckCircle2 className="w-3 h-3" /> : statusTone === 'failed' ? <span>✕</span> : <Loader2 className="w-3 h-3 animate-spin" />}
                                <span>{orderStatus || 'PROCESSING'}</span>
                            </div>
                        </div>
                        <div className="mt-4 bg-slate-900/30 border border-slate-700/60 rounded-xl p-3">
                            <p className="text-[10px] text-slate-400 font-medium">NEXT STEPS</p>
                            <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                                {orderStatus === 'COMPLETED'
                                    ? `Your deposit is complete! ${selectedToken} has been sent to your wallet on ${networkLabel}.`
                                    : orderStatus === 'FAILED'
                                        ? 'Verification failed. Please contact support if you have already sent payment.'
                                        : `Your payment is being verified. Once confirmed, ${selectedToken} will be sent to your wallet on ${networkLabel}. This may take a few minutes.`}
                            </p>
                        </div>
                    </div>

                    <Button onClick={pollOrderStatus} disabled={polling} className="w-full h-12 bg-slate-800/70 hover:bg-slate-800 text-white font-medium border border-slate-700/60 rounded-xl transition-all">
                        <span className="flex items-center justify-center gap-2">
                            {polling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Refresh Status
                        </span>
                    </Button>

                    {onBack && (
                        <Button onClick={onBack} variant="ghost" className="w-full h-10 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl text-xs">
                            Back to Dashboard
                        </Button>
                    )}
                </motion.div>
            )}
        </div>
    );
}
