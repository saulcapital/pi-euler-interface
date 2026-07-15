export interface Asset {
  id: string;
  address: string;
  decimals: number;
  name: string;
  symbol: string;
}

export interface Chain {
  id: number;
  network: string;
}
export interface CuratorAddresses {
  address: string;
  chainId: number;
}

export interface Curators {
  id: string;
  name: string;
  image: string;
  addresses: CuratorAddresses[];
}

export interface State {
  dailyNetApy: number;
  avgNetApy?: number;
  totalAssets: string;
  totalAssetsUsd: number;
  curators: Curators[];
}

export interface Vault {
  address: string;
  symbol: string;
  name: string;
  asset: Asset;
  chain: Chain;
  state: State;
}

export interface VaultsData {
  vaults: {
    items: Vault[];
  };
}

// User position in a vault, as rendered in dashboard/earn tables
export interface VaultPosition {
  vault: Vault;
  state: {
    assets: string;
    assetsUsd: number;
  };
}
