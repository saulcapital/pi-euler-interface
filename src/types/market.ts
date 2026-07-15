export interface MarketState {
  borrowAssets: number;
  supplyAssets: number;
  fee: number;
  utilization: number;
  dailyNetBorrowApy: number;
  totalLiquidity: string;
  totalLiquidityUsd: number;
  size: string;
  sizeUsd: number;
  netBorrowApy: number;
  netSupplyApy: number;
}

export interface Asset {
  address: string;
  symbol: string;
  decimals: number;
}

export interface MarketChain {
  id: number;
  network: string;
}

export interface MarketInterface {
  price: string;
  marketId: string;
  lltv: string;
  oracleAddress: string;
  irmAddress: string;
  chain: MarketChain;
  loanAsset: Asset;
  collateralAsset: Asset;
  state: MarketState;
}

export interface MarketData {
  markets: {
    items: MarketInterface[];
  };
}

// Flattened user position in a market, as rendered in dashboard/borrow tables
export interface MarketPositionRow {
  marketId: string;
  collateralSymbol: string;
  loanSymbol: string;
  collateralBalance: string;
  loanBalance: string;
  collateralDecimal: number;
  loanDecimal: number;
  borrowUsd: string;
  supplyUsd: string;
  borrowApy: string;
}
