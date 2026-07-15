import React, { FC } from 'react';
import { MarketInterface } from 'types/market';
import { MockActionForm } from 'components/MockActionForm';
import { MOCK_TOKEN_BALANCE } from 'mocks/positions';

interface WithdrawTabProps {
  market: MarketInterface;
  marketId: string;
  accrualPosition?: unknown;
  sdkMarket?: unknown;
  onSuccess?: () => void;
  onBorrowAmountChange: (amount: bigint) => void;
  onLoanAmountChange: (amount: bigint) => void;
}

const WithdrawTab: FC<WithdrawTabProps> = ({ market, onLoanAmountChange }) => (
  <MockActionForm
    title="Withdraw"
    subtitle="Withdraw Loan Token Amount:"
    actionLabel="Withdraw"
    assetSymbol={market.loanAsset?.symbol || 'N/A'}
    assetDecimals={market.loanAsset?.decimals ?? 18}
    balance={MOCK_TOKEN_BALANCE}
    onAmountChange={(amount) => onLoanAmountChange(-amount)}
  />
);

export default WithdrawTab;
