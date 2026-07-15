import { FC } from 'react';

import EarnVaultActionForm from 'components/EarnVaultActionForm';
import { EulerEarnVault } from 'types/euler';

interface DepositTabProps {
  vaultAddress: string;
  vaultData: EulerEarnVault;
  chainId: number;
  assetPriceUsd: number;
  tokenLogoUrl: string;
  onSuccess: () => void;
}

const DepositTab: FC<DepositTabProps> = ({ vaultData, chainId, assetPriceUsd, tokenLogoUrl, onSuccess }) => (
  <EarnVaultActionForm
    mode="supply"
    vault={vaultData}
    chainId={chainId}
    assetPriceUsd={assetPriceUsd}
    tokenLogoUrl={tokenLogoUrl}
    onSuccess={onSuccess}
  />
);

export default DepositTab;
