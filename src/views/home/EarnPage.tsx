import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import {
  Alert,
  Autocomplete,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SwapVertIcon from '@mui/icons-material/SwapVert';

import {
  entityLogoUrl,
  fetchEarnVaultLabels,
  fetchEarnVaultsBatch,
  fetchEntities,
  fetchIntrinsicApys,
  fetchVaultsBatch,
  tokenImageUrl
} from '@/api/euler';
import { getRuntimeConfig } from '@/appconfig/runtime';
import ChainFilter, { ChainFilterValue } from 'components/ChainFilter';
import { ChainBadge } from 'components/ChainIcon';
import { TokenIcon } from 'components/TokenIcon';
import { EulerEarnVault, EulerEarnVaultLabel, EulerEntities, V3VaultDetail } from 'types/euler';
import { formatShortUSDS } from 'utils/formatters';

type SortMode = 'totalSupply' | 'supplyApy' | 'availableLiquidity' | 'name';

interface ExposureAsset {
  address: string;
  symbol: string;
}

interface EarnVaultCard extends EulerEarnVault {
  description: string;
  tags: string[];
  allocatorName: string;
  allocatorLogo?: string;
  availableLiquidityUsd: number;
  exposures: ExposureAsset[];
}

function rawAmount(raw: string | undefined, decimals: number): number {
  if (!raw) return 0;
  try {
    return Number(formatUnits(BigInt(raw), decimals));
  } catch {
    return 0;
  }
}

function isPositiveRaw(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    return BigInt(raw) > 0n;
  } catch {
    return false;
  }
}

function isActiveAllocation(strategy: EulerEarnVault['strategies'][number]): boolean {
  return isPositiveRaw(strategy.allocatedAssets) && (strategy.status === 'active' || strategy.inSupplyQueue || strategy.inWithdrawQueue);
}

function formatUsd(value: number): string {
  if (value > 0 && value < 0.01) return '<$0.01';
  return `$${formatShortUSDS(value)}`;
}

function findAllocator(vault: EulerEarnVault, entities: EulerEntities) {
  const haystack = vault.name.toLowerCase();
  const matches = Object.values(entities)
    .filter((entity) => entity.name && haystack.includes(entity.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length);
  const entity = matches[0];

  return {
    name: entity?.name ?? '-',
    logo: entityLogoUrl(entity?.logo)
  };
}

function calculateAvailableLiquidity(vault: EulerEarnVault): number {
  if (typeof vault.availableAssetsUsd === 'number') return vault.availableAssetsUsd;

  const availableAssets = vault.strategies.reduce((sum, strategy) => {
    try {
      return sum + BigInt(strategy.availableAssets ?? '0');
    } catch {
      return sum;
    }
  }, 0n);
  const totalAssets = rawAmount(vault.totalAssets, vault.asset.decimals);
  if (totalAssets <= 0) return 0;

  const assetPriceUsd = vault.totalSupplyUsd / totalAssets;
  return rawAmount(availableAssets.toString(), vault.asset.decimals) * assetPriceUsd;
}

function getExposures(vault: EulerEarnVault, strategyVaults: Map<string, V3VaultDetail>): ExposureAsset[] {
  const exposures = new Map<string, ExposureAsset>();

  for (const strategy of vault.strategies) {
    if (!isActiveAllocation(strategy)) continue;

    const strategyVault = strategyVaults.get(strategy.address.toLowerCase());
    for (const collateral of strategyVault?.collaterals ?? []) {
      if (!collateral.asset || !collateral.assetSymbol) continue;
      const key = collateral.asset.toLowerCase();
      exposures.set(key, { address: collateral.asset, symbol: collateral.assetSymbol });
    }
  }

  return Array.from(exposures.values());
}

export default function EarnPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { chains } = getRuntimeConfig();

  const [search, setSearch] = useState('');
  const [chainFilter, setChainFilter] = useState<ChainFilterValue>('all');
  const [sortMode, setSortMode] = useState<SortMode>('totalSupply');
  const [allocatorFilter, setAllocatorFilter] = useState<string[]>([]);
  const [assetFilter, setAssetFilter] = useState<string[]>([]);
  const [exposureFilter, setExposureFilter] = useState<string[]>([]);
  const [showExposureFilter, setShowExposureFilter] = useState(false);

  const labelsQueries = useQueries({
    queries: chains.map((chain) => ({
      queryKey: ['euler', 'earn-labels', chain.chainId],
      queryFn: () => fetchEarnVaultLabels(chain.chainId)
    }))
  });
  const entitiesQueries = useQueries({
    queries: chains.map((chain) => ({
      queryKey: ['euler', 'entities', chain.chainId],
      queryFn: () => fetchEntities(chain.chainId)
    }))
  });
  const intrinsicQueries = useQueries({
    queries: chains.map((chain) => ({
      queryKey: ['euler', 'apys-intrinsic', chain.chainId],
      queryFn: () => fetchIntrinsicApys(chain.chainId)
    }))
  });

  const activeLabelsByChain = useMemo(() => {
    return new Map(
      chains.map((chain, index) => [
        chain.chainId,
        (labelsQueries[index]?.data ?? []).filter((label) => !label.deprecated && !label.notExplorable)
      ])
    );
  }, [chains, labelsQueries]);
  const earnAddressesByChain = useMemo(() => {
    return new Map(chains.map((chain) => [chain.chainId, (activeLabelsByChain.get(chain.chainId) ?? []).map((label) => label.address)]));
  }, [activeLabelsByChain, chains]);

  const earnVaultsQueries = useQueries({
    queries: chains.map((chain) => {
      const addresses = earnAddressesByChain.get(chain.chainId) ?? [];
      return {
        queryKey: ['euler', 'earn-vaults-batch', chain.chainId, addresses],
        enabled: addresses.length > 0,
        queryFn: () => fetchEarnVaultsBatch(chain.chainId, addresses)
      };
    })
  });

  const strategyAddressesByChain = useMemo(() => {
    return new Map(
      chains.map((chain, index) => [
        chain.chainId,
        Array.from(
          new Set(
            (earnVaultsQueries[index]?.data?.data ?? [])
              .flatMap((vault) => vault.strategies)
              .filter((strategy) => strategy.vaultType === 'evk')
              .map((strategy) => strategy.address)
          )
        )
      ])
    );
  }, [chains, earnVaultsQueries]);

  const strategyVaultsQueries = useQueries({
    queries: chains.map((chain) => {
      const addresses = strategyAddressesByChain.get(chain.chainId) ?? [];
      return {
        queryKey: ['euler', 'earn-strategy-vaults', chain.chainId, addresses],
        enabled: addresses.length > 0,
        queryFn: () => fetchVaultsBatch(chain.chainId, addresses)
      };
    })
  });

  const cards = useMemo<EarnVaultCard[]>(() => {
    return chains.flatMap((chain, index) => {
      const labelMap = new Map<string, EulerEarnVaultLabel>(
        (activeLabelsByChain.get(chain.chainId) ?? []).map((label) => [label.address.toLowerCase(), label])
      );
      const strategyVaultMap = new Map<string, V3VaultDetail>();
      for (const vault of strategyVaultsQueries[index]?.data?.data ?? []) {
        strategyVaultMap.set(vault.address.toLowerCase(), vault);
      }
      const intrinsicByAsset = new Map<string, number>();
      for (const apy of intrinsicQueries[index]?.data?.data ?? []) {
        intrinsicByAsset.set(apy.address.toLowerCase(), apy.apy);
      }

      return (earnVaultsQueries[index]?.data?.data ?? []).map((vault) => {
        const label = labelMap.get(vault.address.toLowerCase());
        const allocator = findAllocator(vault, entitiesQueries[index]?.data ?? {});
        return {
          ...vault,
          supplyApy: vault.supplyApy == null ? null : vault.supplyApy + (intrinsicByAsset.get(vault.asset.address.toLowerCase()) ?? 0),
          description: label?.description ?? '',
          tags: label?.tags ?? [],
          allocatorName: allocator.name,
          allocatorLogo: allocator.logo,
          availableLiquidityUsd: calculateAvailableLiquidity(vault),
          exposures: getExposures(vault, strategyVaultMap)
        };
      });
    });
  }, [activeLabelsByChain, chains, earnVaultsQueries, entitiesQueries, intrinsicQueries, strategyVaultsQueries]);

  const allocatorOptions = useMemo(
    () => Array.from(new Set(cards.map((vault) => vault.allocatorName).filter((name) => name !== '-'))).sort(),
    [cards]
  );
  const assetOptions = useMemo(() => Array.from(new Set(cards.map((vault) => vault.asset.symbol).filter(Boolean))).sort(), [cards]);
  const exposureOptions = useMemo(
    () => Array.from(new Set(cards.flatMap((vault) => vault.exposures.map((asset) => asset.symbol)))).sort(),
    [cards]
  );

  const visibleCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = cards.filter((vault) => {
      if (chainFilter !== 'all' && vault.chainId !== chainFilter) return false;
      if (allocatorFilter.length > 0 && !allocatorFilter.includes(vault.allocatorName)) return false;
      if (assetFilter.length > 0 && !assetFilter.includes(vault.asset.symbol)) return false;
      if (exposureFilter.length > 0 && !vault.exposures.some((asset) => exposureFilter.includes(asset.symbol))) return false;
      if (!query) return true;

      const chainName = chains.find((chain) => chain.chainId === vault.chainId)?.label ?? '';
      return [
        vault.name,
        vault.asset.symbol,
        vault.allocatorName,
        vault.description,
        chainName,
        ...vault.exposures.map((asset) => asset.symbol)
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    return filtered.sort((a, b) => {
      const aRecent = a.tags.some((tag) => tag.toLowerCase() === 'recently added');
      const bRecent = b.tags.some((tag) => tag.toLowerCase() === 'recently added');
      if (aRecent !== bRecent) return aRecent ? -1 : 1;

      switch (sortMode) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'supplyApy':
          return (b.supplyApy ?? -Infinity) - (a.supplyApy ?? -Infinity);
        case 'availableLiquidity':
          return b.availableLiquidityUsd - a.availableLiquidityUsd;
        case 'totalSupply':
        default:
          return b.totalSupplyUsd - a.totalSupplyUsd;
      }
    });
  }, [cards, chains, search, chainFilter, allocatorFilter, assetFilter, exposureFilter, sortMode]);

  const loading =
    labelsQueries.some((query) => query.isFetching) ||
    entitiesQueries.some((query) => query.isFetching) ||
    intrinsicQueries.some((query) => query.isFetching) ||
    earnVaultsQueries.some((query, index) => (earnAddressesByChain.get(chains[index].chainId)?.length ?? 0) > 0 && query.isFetching) ||
    strategyVaultsQueries.some(
      (query, index) => (strategyAddressesByChain.get(chains[index].chainId)?.length ?? 0) > 0 && query.isFetching
    );
  const failedChains = chains.filter(
    (chain, index) =>
      labelsQueries[index]?.error ||
      entitiesQueries[index]?.error ||
      intrinsicQueries[index]?.error ||
      earnVaultsQueries[index]?.error ||
      strategyVaultsQueries[index]?.error
  );
  const error =
    labelsQueries.find((query) => query.error)?.error ||
    entitiesQueries.find((query) => query.error)?.error ||
    intrinsicQueries.find((query) => query.error)?.error ||
    earnVaultsQueries.find((query) => query.error)?.error ||
    strategyVaultsQueries.find((query) => query.error)?.error;

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2.5, marginTop: 1 }}>
        <Avatar variant="rounded" sx={{ width: 56, height: 56, bgcolor: 'transparent', border: `1px solid ${theme.palette.divider}` }}>
          <ArrowForwardIcon sx={{ color: theme.palette.secondary.main, fontSize: 30 }} />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h2">Earn</Typography>
          <Typography variant="body1" sx={{ color: theme.palette.grey[500] }}>
            One deposit, diversified yield. Curators allocate your capital across multiple lending strategies.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={1.25} sx={{ marginBottom: showExposureFilter ? 1.25 : 2.5 }} alignItems="center">
        <Grid size={{ xs: 12, md: 3.7 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by asset, market, curator..."
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
        <Grid size={{ xs: 6, md: 1.4 }}>
          <ChainFilter value={chainFilter} onChange={setChainFilter} />
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Select
            fullWidth
            size="small"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            startAdornment={<SwapVertIcon sx={{ fontSize: 18, marginRight: 0.5, color: 'text.secondary' }} />}
          >
            <MenuItem value="totalSupply">Total supply</MenuItem>
            <MenuItem value="supplyApy">Supply APY</MenuItem>
            <MenuItem value="availableLiquidity">Available liquidity</MenuItem>
            <MenuItem value="name">Name</MenuItem>
          </Select>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Autocomplete
            multiple
            size="small"
            options={allocatorOptions}
            value={allocatorFilter}
            onChange={(event, value) => setAllocatorFilter(value)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip label={option} {...getTagProps({ index })} size="small" />)
            }
            renderInput={(params) => <TextField {...params} label="Capital allocator" />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 1.7 }}>
          <Autocomplete
            multiple
            size="small"
            options={assetOptions}
            value={assetFilter}
            onChange={(event, value) => setAssetFilter(value)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip label={option} {...getTagProps({ index })} size="small" />)
            }
            renderInput={(params) => <TextField {...params} label="Asset" />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 1.2 }}>
          <Button
            fullWidth
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setShowExposureFilter((value) => !value)}
            sx={{ height: 40, whiteSpace: 'nowrap', paddingX: 1 }}
          >
            Add filter
          </Button>
        </Grid>
      </Grid>

      {showExposureFilter && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2.5 }}>
          <Autocomplete
            multiple
            size="small"
            options={exposureOptions}
            value={exposureFilter}
            onChange={(event, value) => setExposureFilter(value)}
            sx={{ width: { xs: '100%', sm: 320 } }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip label={option} {...getTagProps({ index })} size="small" />)
            }
            renderInput={(params) => <TextField {...params} label="Current exposure" />}
          />
        </Box>
      )}

      {loading && cards.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 7 }}>
          <CircularProgress />
        </Box>
      )}

      {!!error && cards.length === 0 && !loading && (
        <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography color="error">Failed to load Euler Earn data: {(error as Error).message}</Typography>
          <Typography variant="body2" sx={{ color: theme.palette.grey[500], marginTop: 1 }}>
            Labels and vault metrics come directly from the configured public Euler endpoints.
          </Typography>
        </Paper>
      )}

      {failedChains.length > 0 && cards.length > 0 && (
        <Alert severity="warning" variant="outlined" sx={{ marginBottom: 1.25 }}>
          Some networks could not be fully loaded ({failedChains.map((chain) => chain.label).join(', ')}). Showing available Earn vaults.
        </Alert>
      )}

      {!loading && visibleCards.length === 0 && (!error || cards.length > 0) && (
        <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography>No Earn vaults match the current filters.</Typography>
        </Paper>
      )}

      {visibleCards.length > 0 && (
        <Stack spacing={1.25}>
          {visibleCards.map((vault) => (
            <Paper
              component="article"
              key={`${vault.chainId}:${vault.address.toLowerCase()}`}
              role="link"
              tabIndex={0}
              aria-label={`Open ${vault.name}`}
              onClick={() => navigate(`/earn/vault/${vault.address}?network=${vault.chainId}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/earn/vault/${vault.address}?network=${vault.chainId}`);
                }
              }}
              sx={{
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:hover, &:focus-visible': {
                  borderColor: theme.palette.secondary.main,
                  boxShadow: theme.shadows[2],
                  outline: 'none'
                }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  padding: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              >
                <TokenIcon
                  symbol={vault.asset.symbol}
                  logoUrl={tokenImageUrl(vault.chainId, vault.asset.address)}
                  avatarProps={{ sx: { width: 40, height: 40, fontSize: 12 } }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, marginBottom: 0.25 }}>
                    <Typography variant="body2" sx={{ color: theme.palette.grey[500] }} noWrap>
                      {vault.name}
                    </Typography>
                    <ChainBadge chainId={vault.chainId} />
                    {vault.tags.map((tag) => (
                      <Chip
                        key={`${vault.chainId}:${vault.address}:${tag}`}
                        label={`${tag.slice(0, 1).toUpperCase()}${tag.slice(1)}`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ height: 22 }}
                      />
                    ))}
                  </Box>
                  <Typography variant="h3">{vault.asset.symbol}</Typography>
                  {vault.description && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.grey[500],
                        marginTop: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {vault.description.replace(/\[([^\]]+)]\([^)]+\)/g, '$1').replace(/\s+/g, ' ')}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ flexShrink: 0, textAlign: 'right', marginLeft: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ color: theme.palette.grey[500] }}>
                      Supply APY
                    </Typography>
                    <Tooltip title="Current vault APY before wallet-specific effects" arrow>
                      <InfoOutlinedIcon sx={{ fontSize: 14, color: theme.palette.grey[600] }} />
                    </Tooltip>
                  </Box>
                  <Typography variant="h4" sx={{ color: theme.palette.secondary.main, marginTop: 0.25 }}>
                    {vault.supplyApy == null ? '-' : `${vault.supplyApy.toFixed(2)}%`}
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={2} sx={{ padding: 2 }} alignItems="center">
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="body2" sx={{ color: theme.palette.grey[500], marginBottom: 0.5 }}>
                    Capital allocator
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    <Avatar src={vault.allocatorLogo} alt={vault.allocatorName} sx={{ width: 22, height: 22, fontSize: 10 }}>
                      {vault.allocatorName === '-' ? '-' : vault.allocatorName.slice(0, 1)}
                    </Avatar>
                    <Typography variant="body2" noWrap>
                      {vault.allocatorName}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }} sx={{ textAlign: { xs: 'right', md: 'center' } }}>
                  <Typography variant="body2" sx={{ color: theme.palette.grey[500], marginBottom: 0.5 }}>
                    Total supply
                  </Typography>
                  <Typography variant="body1">{formatUsd(vault.totalSupplyUsd)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }} sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                  <Typography variant="body2" sx={{ color: theme.palette.grey[500], marginBottom: 0.5 }}>
                    Available liquidity
                  </Typography>
                  <Typography variant="body1">{formatUsd(vault.availableLiquidityUsd)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }} sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ color: theme.palette.grey[500], marginBottom: 0.5 }}>
                    Current exposure
                  </Typography>
                  {vault.exposures.length > 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <AvatarGroup
                        max={6}
                        sx={{
                          '& .MuiAvatar-root': {
                            width: 24,
                            height: 24,
                            fontSize: 9,
                            border: `1px solid ${theme.palette.divider}`
                          }
                        }}
                      >
                        {vault.exposures.map((asset) => (
                          <Tooltip key={`${vault.chainId}:${asset.address}`} title={asset.symbol} arrow>
                            <Avatar src={tokenImageUrl(vault.chainId, asset.address)} alt={asset.symbol}>
                              {asset.symbol.slice(0, 2).toUpperCase()}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    </Box>
                  ) : (
                    <Typography variant="body1">-</Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
