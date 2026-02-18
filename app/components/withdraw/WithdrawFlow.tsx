'use client';

import { WithdrawProvider, useWithdraw, Stablecoin } from '@/contexts/WithdrawContext';
import AmountStep from './AmountStep';
import CountryStep from '@/components/withdraw/CountryStep';
import PaycrestWithdrawForm from './PaycrestWithdrawForm';
import PretiumWithdrawForm from './PretiumWithdrawForm';

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
  walletBalance,
  onRefreshBalance,
  onBack,
  executePaycrestTransaction,
  switchChain,
  isConnected,
  stablecoins,
}: WithdrawFlowProps) {
  const { step, providerType, reset } = useWithdraw();

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
          onRefreshBalance={onRefreshBalance}
          onBack={onBack}
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
