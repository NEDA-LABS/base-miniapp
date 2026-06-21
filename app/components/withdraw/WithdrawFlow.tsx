'use client';

import { WithdrawProvider, useWithdraw, Stablecoin } from '@/contexts/WithdrawContext';
import AmountStep from './AmountStep';
import CountryStep from '@/components/withdraw/CountryStep';
import PaycrestWithdrawForm from './PaycrestWithdrawForm';
import PretiumWithdrawForm from './PretiumWithdrawForm';
import RampaOffRampFlow from '@/components/RampaOffRampFlow';
import NtzsWithdrawForm from './NtzsWithdrawForm';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { useEffect } from 'react';

interface WithdrawFlowProps {
  walletAddress: string;
  walletBalance: string;
  onRefreshBalance: () => void;
  onBack: () => void;
  executePaycrestTransaction: (
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
  stablecoins: Stablecoin[];
}

function WithdrawFlowInner({
  walletAddress,
  walletBalance: defaultWalletBalance,
  onRefreshBalance,
  onBack,
  executePaycrestTransaction,
  switchChain,
  isConnected,
  stablecoins,
}: WithdrawFlowProps) {
  const { step, providerType, reset, country, amount, asset, setAsset } = useWithdraw();
  const { address } = useAccount();

  // Default to first stablecoin if none selected
  useEffect(() => {
    if (!asset && stablecoins.length > 0) {
      setAsset(stablecoins[0]);
    }
  }, [asset, stablecoins, setAsset]);

  const { data: balanceData, refetch: refetchDynBalance } = useBalance({
    address: isConnected ? address : undefined,
    token: asset?.address as `0x${string}`,
    chainId: asset?.chainId,
  });

  const walletBalance = balanceData 
    ? parseFloat(formatUnits(balanceData.value, balanceData.decimals || 18)).toFixed(2) 
    : defaultWalletBalance;

  const handleRefreshBalance = () => {
    refetchDynBalance();
    onRefreshBalance();
  };

  const handleSuccess = () => {
    // Reset and go back to home after success
    reset();
    onBack();
  };

  switch (step) {
    case 'amount':
      return (
        <AmountStep
          walletBalance={walletBalance}
          onRefreshBalance={handleRefreshBalance}
          onBack={onBack}
          stablecoins={stablecoins}
        />
      );

    case 'country':
      return (
        <CountryStep
          walletBalance={walletBalance}
          stablecoins={stablecoins}
        />
      );

    case 'provider':
      if (providerType === 'pretium') {
        return (
          <PretiumWithdrawForm
            walletAddress={walletAddress}
            stablecoins={stablecoins}
            switchChain={switchChain}
            isConnected={isConnected}
            onSuccess={handleSuccess}
          />
        );
      }

      if (providerType === 'rampa') {
        if (!country) return null;
        return (
          <RampaOffRampFlow
            country={country}
            stablecoins={stablecoins}
            switchChain={switchChain}
            isConnected={isConnected}
            onSuccess={handleSuccess}
            onBack={onBack}
          />
        );
      }

      if (providerType === 'ntzs') {
        return (
          <NtzsWithdrawForm
             walletAddress={walletAddress}
             stablecoins={stablecoins}
             switchChain={switchChain}
             isConnected={isConnected}
             onSuccess={handleSuccess}
          />
        );
      }

      // Default: Paycrest
      return (
        <PaycrestWithdrawForm
          walletAddress={walletAddress}
          walletBalance={walletBalance}
          onRefreshBalance={onRefreshBalance}
          executeTransaction={executePaycrestTransaction}
          switchChain={switchChain}
          isConnected={isConnected}
          onSuccess={handleSuccess}
        />
      );

    default:
      return null;
  }
}

export default function WithdrawFlow(props: WithdrawFlowProps) {
  return (
    <WithdrawProvider>
      <WithdrawFlowInner {...props} />
    </WithdrawProvider>
  );
}
