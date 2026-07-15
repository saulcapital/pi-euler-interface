import { Vault } from 'types/vaults';

// Static demo data for the vaults (Earn) tables/pages.
// Replace with real protocol data when wiring an API (see step 2: Euler interface).

export const mockVaults: Vault[] = [
  {
    address: '0xaaaa000000000000000000000000000000000001',
    symbol: 'bpUSDC',
    name: 'Prime USDC Vault',
    asset: {
      id: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC'
    },
    chain: { id: 1, network: 'ethereum' },
    state: {
      dailyNetApy: 0.0482,
      avgNetApy: 0.0475,
      totalAssets: '185000000000000',
      totalAssetsUsd: 185_000_000,
      curators: [{ id: 'demo-curator-a', name: 'Demo Curator A', image: '', addresses: [] }]
    }
  },
  {
    address: '0xaaaa000000000000000000000000000000000002',
    symbol: 'bpWETH',
    name: 'Core WETH Vault',
    asset: {
      id: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18,
      name: 'Wrapped Ether',
      symbol: 'WETH'
    },
    chain: { id: 1, network: 'ethereum' },
    state: {
      dailyNetApy: 0.0261,
      avgNetApy: 0.0254,
      totalAssets: '42000000000000000000000',
      totalAssetsUsd: 142_800_000,
      curators: [{ id: 'demo-curator-b', name: 'Demo Curator B', image: '', addresses: [] }]
    }
  },
  {
    address: '0xaaaa000000000000000000000000000000000003',
    symbol: 'bpUSDT',
    name: 'Flagship USDT Vault',
    asset: {
      id: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      name: 'Tether USD',
      symbol: 'USDT'
    },
    chain: { id: 1, network: 'ethereum' },
    state: {
      dailyNetApy: 0.0521,
      avgNetApy: 0.0515,
      totalAssets: '96000000000000',
      totalAssetsUsd: 96_000_000,
      curators: [{ id: 'demo-curator-a', name: 'Demo Curator A', image: '', addresses: [] }]
    }
  },
  {
    address: '0xaaaa000000000000000000000000000000000004',
    symbol: 'bpUSDCb',
    name: 'Base USDC Vault',
    asset: {
      id: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC'
    },
    chain: { id: 8453, network: 'base' },
    state: {
      dailyNetApy: 0.0563,
      avgNetApy: 0.0549,
      totalAssets: '58000000000000',
      totalAssetsUsd: 58_000_000,
      curators: [{ id: 'demo-curator-c', name: 'Demo Curator C', image: '', addresses: [] }]
    }
  },
  {
    address: '0xaaaa000000000000000000000000000000000005',
    symbol: 'bpWETHb',
    name: 'Base WETH Vault',
    asset: {
      id: '0x4200000000000000000000000000000000000006',
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18,
      name: 'Wrapped Ether',
      symbol: 'WETH'
    },
    chain: { id: 8453, network: 'base' },
    state: {
      dailyNetApy: 0.0243,
      avgNetApy: 0.0239,
      totalAssets: '9800000000000000000000',
      totalAssetsUsd: 33_320_000,
      curators: [{ id: 'demo-curator-b', name: 'Demo Curator B', image: '', addresses: [] }]
    }
  },
  {
    address: '0xaaaa000000000000000000000000000000000006',
    symbol: 'bpDAI',
    name: 'Conservative DAI Vault',
    asset: {
      id: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      decimals: 18,
      name: 'Dai Stablecoin',
      symbol: 'DAI'
    },
    chain: { id: 1, network: 'ethereum' },
    state: {
      dailyNetApy: 0.0334,
      avgNetApy: 0.0329,
      totalAssets: '27500000000000000000000000',
      totalAssetsUsd: 27_500_000,
      curators: [{ id: 'demo-curator-c', name: 'Demo Curator C', image: '', addresses: [] }]
    }
  },
  {
    address: '0xaaaa000000000000000000000000000000000007',
    symbol: 'bpUSDCp',
    name: 'Polygon USDC Vault',
    asset: {
      id: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC'
    },
    chain: { id: 137, network: 'polygon' },
    state: {
      dailyNetApy: 0.0618,
      avgNetApy: 0.0602,
      totalAssets: '12400000000000',
      totalAssetsUsd: 12_400_000,
      curators: [{ id: 'demo-curator-a', name: 'Demo Curator A', image: '', addresses: [] }]
    }
  },
  {
    address: '0xaaaa000000000000000000000000000000000008',
    symbol: 'bpWBTC',
    name: 'WBTC Yield Vault',
    asset: {
      id: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      decimals: 8,
      name: 'Wrapped BTC',
      symbol: 'WBTC'
    },
    chain: { id: 1, network: 'ethereum' },
    state: {
      dailyNetApy: 0.0112,
      avgNetApy: 0.0109,
      totalAssets: '52000000000',
      totalAssetsUsd: 50_440_000,
      curators: [{ id: 'demo-curator-b', name: 'Demo Curator B', image: '', addresses: [] }]
    }
  },
  {
    address: '0xaaaa000000000000000000000000000000000009',
    symbol: 'bpUSDCu',
    name: 'Unichain USDC Vault',
    asset: {
      id: '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
      address: '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC'
    },
    chain: { id: 130, network: 'unichain' },
    state: {
      dailyNetApy: 0.0587,
      avgNetApy: 0.0571,
      totalAssets: '6200000000000',
      totalAssetsUsd: 6_200_000,
      curators: [{ id: 'demo-curator-c', name: 'Demo Curator C', image: '', addresses: [] }]
    }
  },
  {
    address: '0xaaaa00000000000000000000000000000000000a',
    symbol: 'bpwstETH',
    name: 'wstETH Growth Vault',
    asset: {
      id: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
      address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
      decimals: 18,
      name: 'Wrapped liquid staked Ether 2.0',
      symbol: 'wstETH'
    },
    chain: { id: 1, network: 'ethereum' },
    state: {
      dailyNetApy: 0.0198,
      avgNetApy: 0.0195,
      totalAssets: '15600000000000000000000',
      totalAssetsUsd: 61_000_000,
      curators: [{ id: 'demo-curator-a', name: 'Demo Curator A', image: '', addresses: [] }]
    }
  }
];
