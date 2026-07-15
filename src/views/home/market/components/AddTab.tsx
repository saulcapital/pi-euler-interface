import React, { FC } from 'react';
import { MarketInterface } from 'types/market';
import { MockActionForm } from 'components/MockActionForm';
import { MOCK_TOKEN_BALANCE } from 'mocks/positions';

interface AddTabProps {
  market: MarketInterface;
  marketId: string;
  onSuccess?: () => void;
  onBorrowAmountChange: (amount: bigint) => void;
  onCollateralAmountChange: (amount: bigint) => void;
}

const AddTab: FC<AddTabProps> = ({ market, onCollateralAmountChange }) => (
  <MockActionForm
    title="Add Collateral"
    subtitle="Deposit Collateral Token Amount:"
    actionLabel="Add Collateral"
    assetSymbol={market.collateralAsset?.symbol || 'N/A'}
    assetDecimals={market.collateralAsset?.decimals ?? 18}
    balance={MOCK_TOKEN_BALANCE}
    onAmountChange={onCollateralAmountChange}
  />
);

export default AddTab;
