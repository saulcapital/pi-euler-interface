import React, { FC } from 'react';
import { MarketInterface } from 'types/market';
import { MockActionForm } from 'components/MockActionForm';
import { MOCK_TOKEN_BALANCE } from 'mocks/positions';

interface WithdrawCollateralTabProps {
  market: MarketInterface;
  marketId: string;
  accrualPosition?: unknown;
  onSuccess?: () => void;
  onBorrowAmountChange: (amount: bigint) => void;
  onCollateralAmountChange: (amount: bigint) => void;
}

const WithdrawCollateralTab: FC<WithdrawCollateralTabProps> = ({ market, onCollateralAmountChange }) => (
  <MockActionForm
    title="Withdraw Collateral"
    subtitle="Withdraw Collateral Token Amount:"
    actionLabel="Withdraw Collateral"
    assetSymbol={market.collateralAsset?.symbol || 'N/A'}
    assetDecimals={market.collateralAsset?.decimals ?? 18}
    balance={MOCK_TOKEN_BALANCE}
    onAmountChange={(amount) => onCollateralAmountChange(-amount)}
  />
);

export default WithdrawCollateralTab;
