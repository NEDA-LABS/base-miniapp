'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WithdrawStep = 'amount' | 'country' | 'provider';
export type ProviderType = 'paycrest' | 'pretium' | 'rampa' | null;

export interface Stablecoin {
  baseToken: string;
  name: string;
  chainId: number;
  address: string;
  decimals: number;
  flag?: string;
  balance?: string;
}

export interface WithdrawCountry {
  name: string;
  code: string;
  flag: string;
  currency: string;
  countryCode: string;
  comingSoon?: boolean;
}

// Countries served by Pretium off-ramp (mobile money: GH, CD)
const PRETIUM_COUNTRIES = ['GH', 'CD'];

// Countries served by Rampa off-ramp
const RAMPA_COUNTRIES = ['MW'];

// All withdraw-eligible countries
export const WITHDRAW_COUNTRIES: WithdrawCountry[] = [
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', currency: 'NGN', countryCode: '+234' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪', currency: 'KES', countryCode: '+254' },
  { name: 'Tanzania', code: 'TZ', flag: '🇹🇿', currency: 'TZS', countryCode: '+255' },
  { name: 'Uganda', code: 'UG', flag: '🇺🇬', currency: 'UGX', countryCode: '+256' },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭', currency: 'GHS', countryCode: '+233' },
  { name: 'DR Congo', code: 'CD', flag: '🇨🇩', currency: 'CDF', countryCode: '+243' },
  { name: 'Malawi (P2P)', code: 'MW', flag: '🇲🇼', currency: 'MWK', countryCode: '+265' },
];

export function getProviderForCountry(countryCode: string): ProviderType {
  if (PRETIUM_COUNTRIES.includes(countryCode)) return 'pretium';
  if (RAMPA_COUNTRIES.includes(countryCode)) return 'rampa';
  return 'paycrest';
}

export function getProviderLabel(provider: ProviderType): string {
  switch (provider) {
    case 'paycrest': return 'Payramp';
    case 'pretium': return 'Pretium';
    case 'rampa': return 'Rampa';
    default: return '';
  }
}

// ─── Context Shape ───────────────────────────────────────────────────────────

interface WithdrawContextType {
  // State
  step: WithdrawStep;
  amount: string;
  country: WithdrawCountry | null;
  providerType: ProviderType;

  // Setters
  setAmount: (amount: string) => void;
  selectCountry: (country: WithdrawCountry) => void;

  // Navigation
  goToAmount: () => void;
  goToCountry: () => void;
  goToProvider: () => void;
  reset: () => void;
}

const WithdrawContext = createContext<WithdrawContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function WithdrawProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<WithdrawStep>('amount');
  const [amount, setAmountState] = useState('');
  const [country, setCountryState] = useState<WithdrawCountry | null>(null);
  const [providerType, setProviderType] = useState<ProviderType>(null);

  const setAmount = useCallback((val: string) => {
    setAmountState(val);
  }, []);

  const selectCountry = useCallback((c: WithdrawCountry) => {
    setCountryState(c);
    setProviderType(getProviderForCountry(c.code));
  }, []);

  const goToAmount = useCallback(() => setStep('amount'), []);

  const goToCountry = useCallback(() => {
    if (!amount || parseFloat(amount) <= 0) return; // Guard
    setStep('country');
  }, [amount]);

  const goToProvider = useCallback(() => {
    if (!country) return; // Guard
    setStep('provider');
  }, [country]);

  const reset = useCallback(() => {
    setStep('amount');
    setAmountState('');
    setCountryState(null);
    setProviderType(null);
  }, []);

  return (
    <WithdrawContext.Provider
      value={{
        step,
        amount,
        country,
        providerType,
        setAmount,
        selectCountry,
        goToAmount,
        goToCountry,
        goToProvider,
        reset,
      }}
    >
      {children}
    </WithdrawContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWithdraw() {
  const ctx = useContext(WithdrawContext);
  if (!ctx) {
    throw new Error('useWithdraw must be used within a <WithdrawProvider>');
  }
  return ctx;
}
