import React, { FC } from 'react';
import { MarketInterface } from 'types/market';
import { MockActionForm } from 'components/MockActionForm';
import { MOCK_TOKEN_BALANCE } from 'mocks/positions';

interface RepayTabProps {
  market: MarketInterface;
  marketId: string;
  accrualPosition?: unknown;
  sdkMarket?: unknown;
  onSuccess?: () => void;
  onBorrowAmountChange: (amount: bigint) => void;
  onCollateralAmountChange: (amount: bigint) => void;
}

const RepayTab: FC<RepayTabProps> = ({ market, onBorrowAmountChange }) => (
  <MockActionForm
    title="Repay"
    subtitle="Repay Loan Token Amount:"
    actionLabel="Repay"
    assetSymbol={market.loanAsset?.symbol || 'N/A'}
    assetDecimals={market.loanAsset?.decimals ?? 18}
    balance={MOCK_TOKEN_BALANCE}
    onAmountChange={(amount) => onBorrowAmountChange(-amount)}
  />
);

export default RepayTab;
