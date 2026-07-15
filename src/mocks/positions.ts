import { MarketPositionRow } from 'types/market';
import { VaultPosition } from 'types/vaults';
import { mockVaults } from './vaults';

// Static demo user positions for the dashboard and list pages.
// Replace with real protocol data when wiring an API (see step 2: Euler interface).

export const mockMarketPositions: MarketPositionRow[] = [
  {
    marketId: '0x1111111111111111111111111111111111111111111111111111111111111111',
    collateralSymbol: 'WETH',
    loanSymbol: 'USDC',
    collateralBalance: '2500000000000000000', // 2.5 WETH
    loanBalance: '4200000000', // 4200 USDC
    collateralDecimal: 18,
    loanDecimal: 6,
    borrowUsd: '4200',
    supplyUsd: '8500',
    borrowApy: '0.052'
  },
  {
    marketId: '0x3333333333333333333333333333333333333333333333333333333333333333',
    collateralSymbol: 'WBTC',
    loanSymbol: 'USDT',
    collateralBalance: '15000000', // 0.15 WBTC
    loanBalance: '6800000000', // 6800 USDT
    collateralDecimal: 8,
    loanDecimal: 6,
    borrowUsd: '6800',
    supplyUsd: '14550',
    borrowApy: '0.047'
  }
];

export const mockVaultPositions: VaultPosition[] = [
  {
    vault: mockVaults[0], // Prime USDC Vault
    state: {
      assets: '12500000000', // 12,500 USDC
      assetsUsd: 12_500
    }
  },
  {
    vault: mockVaults[1], // Core WETH Vault
    state: {
      assets: '3200000000000000000', // 3.2 WETH
      assetsUsd: 10_880
    }
  }
];

// Positions grouped by chain, as consumed by the dashboard page
export interface ChainPositions {
  chainId: number;
  marketPositions: MarketPositionRow[];
  vaultPositions: VaultPosition[];
}

export const mockChainPositions: ChainPositions[] = [
  {
    chainId: 1,
    marketPositions: mockMarketPositions,
    vaultPositions: mockVaultPositions
  },
  {
    chainId: 8453,
    marketPositions: [
      {
        marketId: '0x5555555555555555555555555555555555555555555555555555555555555555',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        collateralBalance: '1200000000000000000', // 1.2 WETH
        loanBalance: '1500000000', // 1500 USDC
        collateralDecimal: 18,
        loanDecimal: 6,
        borrowUsd: '1500',
        supplyUsd: '4080',
        borrowApy: '0.055'
      }
    ],
    vaultPositions: [
      {
        vault: mockVaults[3], // Base USDC Vault
        state: {
          assets: '5400000000', // 5,400 USDC
          assetsUsd: 5_400
        }
      }
    ]
  }
];

// Demo wallet balances used by the mocked action forms
export const MOCK_TOKEN_BALANCE = '10000'; // in token units (before decimals)
export const MOCK_VAULT_BALANCE = '1250.5'; // deposited amount shown on vault page
