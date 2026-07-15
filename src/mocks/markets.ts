import { MarketInterface } from 'types/market';

// Static demo data for the markets tables/pages.
// Replace with real protocol data when wiring an API (see step 2: Euler interface).

const asset = (address: string, symbol: string, decimals: number) => ({ address, symbol, decimals });

export const mockMarkets: MarketInterface[] = [
  {
    marketId: '0x1111111111111111111111111111111111111111111111111111111111111111',
    price: '3400000000000000000000',
    lltv: '860000000000000000',
    oracleAddress: '0x0000000000000000000000000000000000000101',
    irmAddress: '0x0000000000000000000000000000000000000201',
    chain: { id: 1, network: 'ethereum' },
    loanAsset: asset('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 6),
    collateralAsset: asset('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 18),
    state: {
      borrowAssets: 182_000_000,
      supplyAssets: 214_000_000,
      fee: 0,
      utilization: 0.85,
      dailyNetBorrowApy: 0.0512,
      totalLiquidity: '32000000000000',
      totalLiquidityUsd: 32_000_000,
      size: '214000000000000',
      sizeUsd: 214_000_000,
      netBorrowApy: 0.052,
      netSupplyApy: 0.041
    }
  },
  {
    marketId: '0x2222222222222222222222222222222222222222222222222222222222222222',
    price: '3400000000000000000000',
    lltv: '945000000000000000',
    oracleAddress: '0x0000000000000000000000000000000000000102',
    irmAddress: '0x0000000000000000000000000000000000000201',
    chain: { id: 1, network: 'ethereum' },
    loanAsset: asset('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 18),
    collateralAsset: asset('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', 'wstETH', 18),
    state: {
      borrowAssets: 98_000,
      supplyAssets: 121_000,
      fee: 0,
      utilization: 0.81,
      dailyNetBorrowApy: 0.0231,
      totalLiquidity: '23000000000000000000000',
      totalLiquidityUsd: 78_200_000,
      size: '121000000000000000000000',
      sizeUsd: 411_400_000,
      netBorrowApy: 0.0235,
      netSupplyApy: 0.0182
    }
  },
  {
    marketId: '0x3333333333333333333333333333333333333333333333333333333333333333',
    price: '97000000000000000000000',
    lltv: '860000000000000000',
    oracleAddress: '0x0000000000000000000000000000000000000103',
    irmAddress: '0x0000000000000000000000000000000000000201',
    chain: { id: 1, network: 'ethereum' },
    loanAsset: asset('0xdAC17F958D2ee523a2206206994597C13D831ec7', 'USDT', 6),
    collateralAsset: asset('0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 'WBTC', 8),
    state: {
      borrowAssets: 54_000_000,
      supplyAssets: 71_000_000,
      fee: 0,
      utilization: 0.76,
      dailyNetBorrowApy: 0.0468,
      totalLiquidity: '17000000000000',
      totalLiquidityUsd: 17_000_000,
      size: '71000000000000',
      sizeUsd: 71_000_000,
      netBorrowApy: 0.047,
      netSupplyApy: 0.0352
    }
  },
  {
    marketId: '0x4444444444444444444444444444444444444444444444444444444444444444',
    price: '3400000000000000000000',
    lltv: '770000000000000000',
    oracleAddress: '0x0000000000000000000000000000000000000104',
    irmAddress: '0x0000000000000000000000000000000000000201',
    chain: { id: 8453, network: 'base' },
    loanAsset: asset('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'USDC', 6),
    collateralAsset: asset('0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', 'cbBTC', 8),
    state: {
      borrowAssets: 41_000_000,
      supplyAssets: 63_000_000,
      fee: 0,
      utilization: 0.65,
      dailyNetBorrowApy: 0.0389,
      totalLiquidity: '22000000000000',
      totalLiquidityUsd: 22_000_000,
      size: '63000000000000',
      sizeUsd: 63_000_000,
      netBorrowApy: 0.039,
      netSupplyApy: 0.0254
    }
  },
  {
    marketId: '0x5555555555555555555555555555555555555555555555555555555555555555',
    price: '3400000000000000000000',
    lltv: '860000000000000000',
    oracleAddress: '0x0000000000000000000000000000000000000105',
    irmAddress: '0x0000000000000000000000000000000000000201',
    chain: { id: 8453, network: 'base' },
    loanAsset: asset('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'USDC', 6),
    collateralAsset: asset('0x4200000000000000000000000000000000000006', 'WETH', 18),
    state: {
      borrowAssets: 29_000_000,
      supplyAssets: 34_000_000,
      fee: 0,
      utilization: 0.87,
      dailyNetBorrowApy: 0.0545,
      totalLiquidity: '5000000000000',
      totalLiquidityUsd: 5_000_000,
      size: '34000000000000',
      sizeUsd: 34_000_000,
      netBorrowApy: 0.055,
      netSupplyApy: 0.0463
    }
  },
  {
    marketId: '0x6666666666666666666666666666666666666666666666666666666666666666',
    price: '1000000000000000000',
    lltv: '915000000000000000',
    oracleAddress: '0x0000000000000000000000000000000000000106',
    irmAddress: '0x0000000000000000000000000000000000000201',
    chain: { id: 137, network: 'polygon' },
    loanAsset: asset('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 'USDC', 6),
    collateralAsset: asset('0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', 'DAI', 18),
    state: {
      borrowAssets: 7_800_000,
      supplyAssets: 9_400_000,
      fee: 0,
      utilization: 0.83,
      dailyNetBorrowApy: 0.0611,
      totalLiquidity: '1600000000000',
      totalLiquidityUsd: 1_600_000,
      size: '9400000000000',
      sizeUsd: 9_400_000,
      netBorrowApy: 0.0615,
      netSupplyApy: 0.0508
    }
  },
  {
    marketId: '0x7777777777777777777777777777777777777777777777777777777777777777',
    price: '3400000000000000000000',
    lltv: '860000000000000000',
    oracleAddress: '0x0000000000000000000000000000000000000107',
    irmAddress: '0x0000000000000000000000000000000000000201',
    chain: { id: 130, network: 'unichain' },
    loanAsset: asset('0x078D782b760474a361dDA0AF3839290b0EF57AD6', 'USDC', 6),
    collateralAsset: asset('0x4200000000000000000000000000000000000006', 'WETH', 18),
    state: {
      borrowAssets: 3_100_000,
      supplyAssets: 4_500_000,
      fee: 0,
      utilization: 0.69,
      dailyNetBorrowApy: 0.0425,
      totalLiquidity: '1400000000000',
      totalLiquidityUsd: 1_400_000,
      size: '4500000000000',
      sizeUsd: 4_500_000,
      netBorrowApy: 0.043,
      netSupplyApy: 0.0297
    }
  },
  {
    marketId: '0x8888888888888888888888888888888888888888888888888888888888888888',
    price: '1150000000000000000',
    lltv: '945000000000000000',
    oracleAddress: '0x0000000000000000000000000000000000000108',
    irmAddress: '0x0000000000000000000000000000000000000201',
    chain: { id: 1, network: 'ethereum' },
    loanAsset: asset('0x6B175474E89094C44Da98b954EedeAC495271d0F', 'DAI', 18),
    collateralAsset: asset('0x83F20F44975D03b1b09e64809B757c47f942BEeA', 'sDAI', 18),
    state: {
      borrowAssets: 12_500_000,
      supplyAssets: 15_800_000,
      fee: 0,
      utilization: 0.79,
      dailyNetBorrowApy: 0.0288,
      totalLiquidity: '3300000000000000000000000',
      totalLiquidityUsd: 3_300_000,
      size: '15800000000000000000000000',
      sizeUsd: 15_800_000,
      netBorrowApy: 0.029,
      netSupplyApy: 0.0221
    }
  }
];
