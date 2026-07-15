import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Autocomplete,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { Address, Hex, decodeFunctionResult, encodeFunctionData } from 'viem';

import { entityLogoUrl, fetchEntities, fetchProducts, fetchVaultsBatch, rpcCall, tokenImageUrl } from '@/api/euler';
import { useNetworkParam } from 'hooks/useNetworkParam';
import { ERC20_ABI, ERC4626_ABI } from '@/contracts/erc4626';
import { TokenIcon } from 'components/TokenIcon';
import { EulerProduct, V3VaultDetail } from 'types/euler';
import { formatShortUSDS } from 'utils/formatters';

type SortMode = 'totalBorrowed' | 'borrowApy' | 'maxMultiplier' | 'maxLtv' | 'availableLiquidity' | 'name';

interface BorrowPair {
  id: string;
  collateralVault: string;
  collateralAssetAddress: string;
  collateralSymbol: string;
  borrowVault: string;
  borrowAssetAddress: string;
  borrowSymbol: string;
  marketName: string;
  riskManagerName: string;
  riskManagerLogo?: string;
  borrowApy: number;
  borrowLtv: number; // 0..1
  liquidationLtv: number; // 0..1
  maxMultiplier: number; // 1 / (1 - borrowLtv)
  totalBorrowedUsd: number;
  availableLiquidityUsd: number;
  recentlyAdded: boolean;
  privateMarket: boolean;
}

interface ProductMembership {
  product: EulerProduct;
  override?: NonNullable<EulerProduct['vaultOverrides']>[string];
  riskManagerSlug?: string;
}

function productEntities(product: EulerProduct): string[] {
  return (Array.isArray(product.entity) ? product.entity : [product.entity]).filter(Boolean);
}

function productVaultOverride(product: EulerProduct, address: string) {
  const target = address.toLowerCase();
  return Object.entries(product.vaultOverrides ?? {}).find(([overrideAddress]) => overrideAddress.toLowerCase() === target)?.[1];
}

// Collateral vaults occasionally arrive without their underlying asset resolved in the batch
// payload (escrow-only vaults are notFound); fall back to reading asset()/symbol() on-chain.
async function resolveCollateralVaults(
  chainId: number,
  vaultAddresses: string[]
): Promise<Record<string, { address: string; symbol: string }>> {
  const entries = await Promise.all(
    vaultAddresses.map(async (vaultAddress): Promise<[string, { address: string; symbol: string }] | null> => {
      try {
        const assetResult = await rpcCall<Hex>(chainId, 'eth_call', [
          { to: vaultAddress, data: encodeFunctionData({ abi: ERC4626_ABI, functionName: 'asset' }) },
          'latest'
        ]);
        const assetAddress = decodeFunctionResult({ abi: ERC4626_ABI, functionName: 'asset', data: assetResult }) as Address;
        const symbolResult = await rpcCall<Hex>(chainId, 'eth_call', [
          { to: assetAddress, data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'symbol' }) },
          'latest'
        ]);
        const symbol = decodeFunctionResult({ abi: ERC20_ABI, functionName: 'symbol', data: symbolResult }) as string;
        return [vaultAddress.toLowerCase(), { address: assetAddress, symbol }];
      } catch {
        return null;
      }
    })
  );
  return Object.fromEntries(entries.filter((entry): entry is [string, { address: string; symbol: string }] => entry !== null));
}

const ROWS_PER_PAGE = 25;

export default function BorrowPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { chainId } = useNetworkParam();

  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('totalBorrowed');
  const [riskManagerFilter, setRiskManagerFilter] = useState<string[]>([]);
  const [collateralFilter, setCollateralFilter] = useState<string[]>([]);
  const [borrowFilter, setBorrowFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Filters name risk managers/assets of one chain — they cannot carry over to another.
  useEffect(() => {
    setRiskManagerFilter([]);
    setCollateralFilter([]);
    setBorrowFilter([]);
  }, [chainId]);

  const productsQuery = useQuery({ queryKey: ['euler', 'products', chainId], queryFn: () => fetchProducts(chainId) });
  const entitiesQuery = useQuery({ queryKey: ['euler', 'entities', chainId], queryFn: () => fetchEntities(chainId) });

  const vaultAddresses = useMemo(() => {
    const addresses = new Set<string>();
    for (const product of Object.values(productsQuery.data ?? {})) {
      if (product.notExplorable) continue;
      for (const address of product.vaults ?? []) {
        if (!productVaultOverride(product, address)?.notExplorableLend) addresses.add(address);
      }
    }
    return Array.from(addresses);
  }, [productsQuery.data]);

  const vaultsQuery = useQuery({
    queryKey: ['euler', 'borrow-vaults-batch', chainId, vaultAddresses],
    enabled: vaultAddresses.length > 0,
    queryFn: () => fetchVaultsBatch(chainId, vaultAddresses)
  });

  const unresolvedCollateralVaults = useMemo(() => {
    const addresses = new Set<string>();
    for (const vault of vaultsQuery.data?.data ?? []) {
      for (const collateral of vault.collaterals ?? []) {
        if (!collateral.asset || !collateral.assetSymbol) addresses.add(collateral.collateral);
      }
    }
    return Array.from(addresses);
  }, [vaultsQuery.data]);

  const collateralAssetsQuery = useQuery({
    queryKey: ['euler', 'borrow-collateral-assets', chainId, unresolvedCollateralVaults],
    enabled: unresolvedCollateralVaults.length > 0,
    queryFn: () => resolveCollateralVaults(chainId, unresolvedCollateralVaults)
  });

  // Each accepted (collateral, borrowable) combination is its own borrow market — mirrors the
  // pair-based rows of the official Euler borrow page and its /borrow/<collateral>/<liability> route.
  const pairs = useMemo<BorrowPair[]>(() => {
    const memberships = new Map<string, ProductMembership>();
    for (const product of Object.values(productsQuery.data ?? {})) {
      if (product.notExplorable) continue;
      const riskManagerSlug = productEntities(product)[0];
      for (const address of product.vaults ?? []) {
        const override = productVaultOverride(product, address);
        if (!override?.notExplorableLend) memberships.set(address.toLowerCase(), { product, override, riskManagerSlug });
      }
    }

    const vaultsByAddress = new Map((vaultsQuery.data?.data ?? []).map((vault) => [vault.address.toLowerCase(), vault] as const));
    const entities = entitiesQuery.data ?? {};

    return (vaultsQuery.data?.data ?? []).flatMap((vault: V3VaultDetail) => {
      const membership = memberships.get(vault.address.toLowerCase());
      if (!membership || !vault.collaterals?.length) return [];

      const { product, override, riskManagerSlug } = membership;
      const riskManager = riskManagerSlug ? entities[riskManagerSlug] : undefined;
      const tags = [...(product.tags ?? []), ...(override?.tags ?? [])].map((tag) => tag.toLowerCase());
      const availableLiquidityUsd = Math.max((vault.totalSupplyUsd || 0) - (vault.totalBorrowsUsd || 0), 0);

      return vault.collaterals.flatMap((collateral): BorrowPair[] => {
        const borrowLtv = Number(collateral.borrowLTV) / 10_000;
        if (!borrowLtv || borrowLtv <= 0) return []; // 0 LTV = not borrowable against this collateral
        const collateralVault = vaultsByAddress.get(collateral.collateral.toLowerCase());
        const resolved = collateralAssetsQuery.data?.[collateral.collateral.toLowerCase()];
        const collateralAssetAddress = collateral.asset || collateralVault?.asset.address || resolved?.address;
        const collateralSymbol = collateral.assetSymbol || collateralVault?.asset.symbol || resolved?.symbol;
        if (!collateralAssetAddress || !collateralSymbol) return [];
        const liquidationLtv = Number(collateral.liquidationLTV) / 10_000;

        return [
          {
            id: `${collateral.collateral.toLowerCase()}-${vault.address.toLowerCase()}`,
            collateralVault: collateral.collateral,
            collateralAssetAddress,
            collateralSymbol,
            borrowVault: vault.address,
            borrowAssetAddress: vault.asset.address,
            borrowSymbol: vault.asset.symbol,
            marketName: override?.name ?? product.name ?? vault.name,
            riskManagerName: riskManager?.name ?? riskManagerSlug ?? '-',
            riskManagerLogo: entityLogoUrl(riskManager?.logo),
            borrowApy: vault.borrowApy || 0,
            borrowLtv,
            liquidationLtv,
            maxMultiplier: borrowLtv < 1 ? 1 / (1 - borrowLtv) : Infinity,
            totalBorrowedUsd: vault.totalBorrowsUsd || 0,
            availableLiquidityUsd,
            recentlyAdded: tags.includes('recently added'),
            privateMarket: tags.includes('private') || tags.includes('keyring') || tags.includes('access control')
          }
        ];
      });
    });
  }, [collateralAssetsQuery.data, entitiesQuery.data, productsQuery.data, vaultsQuery.data]);

  const riskManagerOptions = useMemo(
    () => Array.from(new Set(pairs.map((pair) => pair.riskManagerName).filter((name) => name !== '-'))).sort(),
    [pairs]
  );
  const collateralOptions = useMemo(() => Array.from(new Set(pairs.map((pair) => pair.collateralSymbol))).sort(), [pairs]);
  const borrowOptions = useMemo(() => Array.from(new Set(pairs.map((pair) => pair.borrowSymbol))).sort(), [pairs]);

  const visiblePairs = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = pairs.filter((pair) => {
      if (riskManagerFilter.length > 0 && !riskManagerFilter.includes(pair.riskManagerName)) return false;
      if (collateralFilter.length > 0 && !collateralFilter.includes(pair.collateralSymbol)) return false;
      if (borrowFilter.length > 0 && !borrowFilter.includes(pair.borrowSymbol)) return false;
      if (!query) return true;
      return [pair.collateralSymbol, pair.borrowSymbol, pair.marketName, pair.riskManagerName].join(' ').toLowerCase().includes(query);
    });

    return filtered.sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return `${a.collateralSymbol}/${a.borrowSymbol}`.localeCompare(`${b.collateralSymbol}/${b.borrowSymbol}`);
        case 'borrowApy':
          return a.borrowApy - b.borrowApy;
        case 'maxMultiplier':
          return b.maxMultiplier - a.maxMultiplier;
        case 'maxLtv':
          return b.borrowLtv - a.borrowLtv;
        case 'availableLiquidity':
          return b.availableLiquidityUsd - a.availableLiquidityUsd;
        case 'totalBorrowed':
        default:
          return b.totalBorrowedUsd - a.totalBorrowedUsd;
      }
    });
  }, [borrowFilter, collateralFilter, pairs, riskManagerFilter, search, sortMode]);

  // Reset to the first page whenever the result set changes.
  useEffect(() => setPage(1), [search, sortMode, riskManagerFilter, collateralFilter, borrowFilter, chainId]);

  const pageCount = Math.max(1, Math.ceil(visiblePairs.length / ROWS_PER_PAGE));
  const pagePairs = visiblePairs.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const openPair = (pair: BorrowPair) => navigate(`/borrow/${pair.collateralVault}/${pair.borrowVault}?network=${chainId}`);

  const loading = productsQuery.isLoading || vaultsQuery.isLoading;
  const error = productsQuery.error || vaultsQuery.error;

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2.5, marginTop: 1 }}>
        <Avatar variant="rounded" sx={{ width: 56, height: 56, bgcolor: 'transparent', border: `1px solid ${theme.palette.divider}` }}>
          <AccountBalanceWalletOutlinedIcon sx={{ color: theme.palette.secondary.main, fontSize: 30 }} />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h2">Borrow</Typography>
          <Typography variant="body1" sx={{ color: theme.palette.grey[500] }}>
            Pick a collateral and an asset to borrow. Open a position or lever it up with Multiply.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={1.25} sx={{ marginBottom: 2.5 }} alignItems="center">
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by collateral, asset, curator..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Select
            fullWidth
            size="small"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            startAdornment={<SwapVertIcon sx={{ fontSize: 18, marginRight: 0.5, color: 'text.secondary' }} />}
          >
            <MenuItem value="totalBorrowed">Total borrowed</MenuItem>
            <MenuItem value="borrowApy">Borrow APY</MenuItem>
            <MenuItem value="maxMultiplier">Max multiplier</MenuItem>
            <MenuItem value="maxLtv">Max LTV</MenuItem>
            <MenuItem value="availableLiquidity">Liquidity</MenuItem>
            <MenuItem value="name">Name</MenuItem>
          </Select>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Autocomplete
            multiple
            size="small"
            options={riskManagerOptions}
            value={riskManagerFilter}
            onChange={(_, value) => setRiskManagerFilter(value)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip label={option} {...getTagProps({ index })} size="small" />)
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Risk manager"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <ShieldOutlinedIcon sx={{ fontSize: 18, marginRight: 0.5 }} />
                        {params.InputProps.startAdornment}
                      </>
                    )
                  }
                }}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 1.85 }}>
          <Autocomplete
            multiple
            size="small"
            options={collateralOptions}
            value={collateralFilter}
            onChange={(_, value) => setCollateralFilter(value)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip label={option} {...getTagProps({ index })} size="small" />)
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Collateral"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <LayersOutlinedIcon sx={{ fontSize: 18, marginRight: 0.5 }} />
                        {params.InputProps.startAdornment}
                      </>
                    )
                  }
                }}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 1.75 }}>
          <Autocomplete
            multiple
            size="small"
            options={borrowOptions}
            value={borrowFilter}
            onChange={(_, value) => setBorrowFilter(value)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip label={option} {...getTagProps({ index })} size="small" />)
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Borrow"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 18, marginRight: 0.5 }} />
                        {params.InputProps.startAdornment}
                      </>
                    )
                  }
                }}
              />
            )}
          />
        </Grid>
      </Grid>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 7 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && !!error && (
        <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography color="error">Failed to load Euler Borrow data: {(error as Error).message}</Typography>
          <Typography variant="body2" sx={{ color: theme.palette.grey[500], marginTop: 1 }}>
            Product labels and EVK metrics come directly from the configured public Euler endpoints.
          </Typography>
        </Paper>
      )}

      {!loading && !error && visiblePairs.length === 0 && (
        <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography>No borrow markets match the current filters.</Typography>
        </Paper>
      )}

      {!loading && !error && visiblePairs.length > 0 && (
        <>
          <Typography variant="body2" sx={{ color: theme.palette.grey[500], marginBottom: 1 }}>
            {visiblePairs.length} borrow markets
          </Typography>
          <Stack spacing={1}>
            {pagePairs.map((pair) => (
              <Paper
                component="article"
                key={pair.id}
                onClick={() => openPair(pair)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openPair(pair);
                  }
                }}
                role="link"
                tabIndex={0}
                sx={{
                  padding: { xs: 1.5, md: 2 },
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: theme.palette.secondary.main },
                  '&:focus-visible': { outline: `2px solid ${theme.palette.secondary.main}`, outlineOffset: 2 }
                }}
              >
                <Grid container spacing={1.5} alignItems="center">
                  <Grid size={{ xs: 12, md: 3.6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TokenIcon
                          symbol={pair.collateralSymbol}
                          logoUrl={tokenImageUrl(chainId, pair.collateralAssetAddress)}
                          avatarProps={{ sx: { width: 30, height: 30, fontSize: 10 } }}
                        />
                        <ArrowForwardIcon sx={{ fontSize: 16, color: theme.palette.grey[500], mx: 0.25 }} />
                        <TokenIcon
                          symbol={pair.borrowSymbol}
                          logoUrl={tokenImageUrl(chainId, pair.borrowAssetAddress)}
                          avatarProps={{ sx: { width: 30, height: 30, fontSize: 10 } }}
                        />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="h4" noWrap>
                            {pair.collateralSymbol} → {pair.borrowSymbol}
                          </Typography>
                          {pair.recentlyAdded && <StarOutlineIcon sx={{ fontSize: 15, color: theme.palette.secondary.main }} />}
                          {pair.privateMarket && <LockOutlinedIcon sx={{ fontSize: 15, color: theme.palette.grey[500] }} />}
                        </Box>
                        <Typography variant="body2" sx={{ color: theme.palette.grey[500] }} noWrap>
                          {pair.marketName}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 4, md: 1.5 }}>
                    <Metric label="Borrow APY" value={`${pair.borrowApy.toFixed(2)}%`} valueColor={theme.palette.warning.main} />
                  </Grid>
                  <Grid size={{ xs: 4, md: 1.5 }}>
                    <Metric label="Max LTV" value={`${(pair.borrowLtv * 100).toFixed(0)}%`} />
                  </Grid>
                  <Grid size={{ xs: 4, md: 1.6 }}>
                    <Metric
                      label="Max multiplier"
                      value={Number.isFinite(pair.maxMultiplier) ? `${pair.maxMultiplier.toFixed(2)}×` : '—'}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <Metric label="Available" value={`$${formatShortUSDS(pair.availableLiquidityUsd)}`} />
                  </Grid>
                  <Grid size={{ xs: 6, md: 1.8 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: { md: 'flex-end' } }}>
                      <Avatar src={pair.riskManagerLogo} alt={pair.riskManagerName} sx={{ width: 20, height: 20, fontSize: 9 }}>
                        {pair.riskManagerName === '-' ? '-' : pair.riskManagerName.slice(0, 1)}
                      </Avatar>
                      <Typography variant="body2" sx={{ color: theme.palette.grey[400] }} noWrap>
                        {pair.riskManagerName}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, marginTop: 2.5 }}>
            <FormControl variant="outlined" size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <InputLabel id="borrow-rows-label">Rows</InputLabel>
              <Select labelId="borrow-rows-label" label="Rows" value={ROWS_PER_PAGE} disabled sx={{ minWidth: 80 }}>
                <MenuItem value={ROWS_PER_PAGE}>{ROWS_PER_PAGE}</MenuItem>
              </Select>
            </FormControl>
            <Pagination count={pageCount} page={page} onChange={(_, value) => setPage(value)} color="primary" />
          </Box>
        </>
      )}
    </Box>
  );
}

function Metric({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const theme = useTheme();
  return (
    <Box>
      <Typography variant="body2" sx={{ color: theme.palette.grey[500] }} noWrap>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ color: valueColor }}>
        {value}
      </Typography>
    </Box>
  );
}
