'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

interface NtzsOnRampFlowProps {
  walletAddress?: string;
  onBack?: () => void;
}

export default function NtzsOnRampFlow({
  walletAddress,
  onBack,
}: NtzsOnRampFlowProps) {
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [amountTzs, setAmountTzs] = useState('10000');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const resolvedAddress = walletAddress || '';
  const isValidEmail = email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidStep1 = Boolean(amountTzs) && Number(amountTzs) >= 1000 && Boolean(phone.trim()) && isValidEmail && Boolean(resolvedAddress);

  const statusTone = status === 'minted' || status === 'completed'
    ? 'success'
    : status === 'failed'
    ? 'failed'
    : 'pending';

  const handleCreateDeposit = async () => {
    if (!resolvedAddress) {
      toast({ title: 'Error', description: 'Wallet address not available', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ntzs/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId: resolvedAddress, // Using wallet address as user ID
          email: email.trim(),
          phone: phone.trim(),
          amountTzs: Number(amountTzs),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initiate deposit');
      }

      setDepositId(data.deposit?.id || data.deposit?.depositId);
      setStatus('pending');
      setCurrentStep(2);
      toast({ title: 'Deposit Initiated', description: 'Please complete the M-Pesa STK push on your phone' });
    } catch (err: any) {
      toast({ title: 'Deposit Failed', description: err?.message || 'Failed to initiate deposit', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const pollDepositStatus = useCallback(async () => {
    if (!depositId) return;
    setPolling(true);
    try {
      const res = await fetch(`/api/ntzs/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositId })
      });
      const data = await res.json();
      if (res.ok && data.status) {
        const s = data.status.status;
        setStatus(s);
        if (s === 'minted' || s === 'completed') {
            toast({ title: 'Success!', description: 'Your NTZS has been sent to your wallet' });
        } else if (s === 'failed') {
            toast({ title: 'Deposit Failed', description: 'Payment failed or was cancelled', variant: 'destructive' });
        }
      }
    } catch {
      // silent
    } finally {
      setPolling(false);
    }
  }, [depositId, toast]);

  useEffect(() => {
    if (currentStep !== 2 || !depositId) return;
    const interval = setInterval(() => {
      if (status !== 'minted' && status !== 'completed' && status !== 'failed') {
        pollDepositStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentStep, depositId, status, pollDepositStatus]);

  const CTA = ({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <div className="relative overflow-hidden rounded-2xl p-[1px] bg-[linear-gradient(135deg,rgba(59,130,246,0.30),rgba(125,211,252,0.18),rgba(59,130,246,0.30))] shadow-[0_0_26px_rgba(59,130,246,0.18),0_20px_46px_rgba(0,0,0,0.35)]">
      <Button onClick={onClick} disabled={disabled} className="relative w-full h-12 overflow-hidden bg-[#070B12] text-white hover:bg-[#050912] font-semibold text-sm border-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-18px_38px_rgba(0,0,0,0.55)] rounded-[calc(1rem-1px)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:ring-0">
        <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.12),transparent_55%)] opacity-[0.55]" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-2">
        {[1, 2].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-6 h-6 rounded-full text-[10px] font-medium flex items-center justify-center border transition-colors ${currentStep >= step ? 'bg-green-500/20 border-green-500/50 text-green-200' : 'bg-slate-800/60 border-slate-700/60 text-slate-500'}`}>
              {step}
            </div>
            {step < 2 && <div className={`w-6 h-px mx-1 transition-colors ${currentStep > step ? 'bg-green-500/50' : 'bg-slate-700/50'}`} />}
          </div>
        ))}
      </div>

      {currentStep === 1 && (
        <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
          <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40 text-center">
             <h3 className="text-white text-lg font-bold">NTZS On-Ramp</h3>
             <p className="text-slate-400 text-xs">Deposit M-Pesa to receive NTZS on Base network</p>
          </div>

          <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40 space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400">Amount to Deposit (TZS)</span>
              <Input type="number" placeholder="Min 1000 TZS" value={amountTzs} onChange={(e) => setAmountTzs(e.target.value)} className="w-full px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400">Email Address</span>
              <Input type="email" placeholder="e.g., you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400">M-Pesa Phone Number</span>
              <Input type="tel" placeholder="e.g., 255712345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-2.5 py-2 bg-slate-900/30 border border-slate-700/60 rounded-xl text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-green-500/50 focus:border-transparent" />
              <p className="text-[10px] text-slate-500">Must be a valid M-Pesa registered number (include country code).</p>
            </div>
            
            <div className="space-y-2">
               <span className="text-xs font-medium text-slate-400">Receive Address</span>
               <div className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/30 flex items-center justify-between gap-2">
                 <p className="text-[10px] text-slate-200 truncate font-mono flex-1">{resolvedAddress || 'No wallet address available'}</p>
                 {resolvedAddress && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
               </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {onBack && <Button onClick={onBack} variant="ghost" className="flex-1 h-12 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl">Back</Button>}
            <div className="flex-[2]">
              <CTA onClick={handleCreateDeposit} disabled={!isValidStep1 || submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Initiating...</span></> : 'Deposit via M-Pesa'}
              </CTA>
            </div>
          </div>
        </motion.div>
      )}

      {currentStep === 2 && depositId && (
        <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
          <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium text-slate-400">Deposit ID</p>
                <p className="text-xs font-mono text-white mt-0.5 break-all">{depositId}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-[10px] font-medium border flex items-center gap-1 ${
                statusTone === 'success' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 
                statusTone === 'failed' ? 'bg-red-500/15 border-red-500/40 text-red-300' : 
                'bg-blue-500/15 border-blue-500/40 text-blue-300'
              }`}>
                {statusTone === 'success' ? <CheckCircle2 className="w-3 h-3" /> : statusTone === 'failed' ? <XCircle className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                <span>{status?.toUpperCase() || 'PENDING'}</span>
              </div>
            </div>
            <div className="mt-4 bg-slate-900/30 border border-slate-700/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-medium">NEXT STEPS</p>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                {statusTone === 'success'
                  ? 'Your deposit is complete! NTZS has been minted to your wallet.'
                  : statusTone === 'failed'
                    ? 'Payment failed. Please try again.'
                    : 'Check your phone and enter your M-Pesa PIN to complete the transaction.'}
              </p>
            </div>
          </div>

          <Button onClick={pollDepositStatus} disabled={polling} className="w-full h-12 bg-slate-800/70 hover:bg-slate-800 text-white font-medium border border-slate-700/60 rounded-xl transition-all">
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
