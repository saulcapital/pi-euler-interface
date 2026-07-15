import { FC } from 'react';

import EarnVaultActionForm from 'components/EarnVaultActionForm';
import { EulerEarnVault } from 'types/euler';

interface WithdrawTabProps {
  vaultAddress: string;
  vaultData: EulerEarnVault;
  chainId: number;
  assetPriceUsd: number;
  tokenLogoUrl: string;
  onSuccess: () => void;
}

const WithdrawTab: FC<WithdrawTabProps> = ({ vaultData, chainId, assetPriceUsd, tokenLogoUrl, onSuccess }) => (
  <EarnVaultActionForm
    mode="withdraw"
    vault={vaultData}
    chainId={chainId}
    assetPriceUsd={assetPriceUsd}
    tokenLogoUrl={tokenLogoUrl}
    onSuccess={onSuccess}
  />
);

export default WithdrawTab;
