import React, { FC } from 'react';
import { MarketInterface } from 'types/market';
import { MockActionForm } from 'components/MockActionForm';
import { MOCK_TOKEN_BALANCE } from 'mocks/positions';

interface SupplyTabProps {
  market: MarketInterface;
  marketId: string;
  onSuccess?: () => void;
  onBorrowAmountChange: (amount: bigint) => void;
  onCollateralAmountChange: (amount: bigint) => void;
}

const SupplyTab: FC<SupplyTabProps> = ({ market, onCollateralAmountChange }) => (
  <MockActionForm
    title="Supply Loan"
    subtitle="Supply Loan Token Amount:"
    actionLabel="Supply"
    assetSymbol={market.loanAsset?.symbol || 'N/A'}
    assetDecimals={market.loanAsset?.decimals ?? 18}
    balance={MOCK_TOKEN_BALANCE}
    onAmountChange={onCollateralAmountChange}
  />
);

export default SupplyTab;
