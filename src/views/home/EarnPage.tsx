import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import {
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
import { useNetworkParam } from 'hooks/useNetworkParam';
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
  const { chainId } = useNetworkParam();

  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('totalSupply');
  const [allocatorFilter, setAllocatorFilter] = useState<string[]>([]);
  const [assetFilter, setAssetFilter] = useState<string[]>([]);
  const [exposureFilter, setExposureFilter] = useState<string[]>([]);
  const [showExposureFilter, setShowExposureFilter] = useState(false);

  // Filters name allocators/assets of one chain — they cannot carry over to another.
  useEffect(() => {
    setAllocatorFilter([]);
    setAssetFilter([]);
    setExposureFilter([]);
  }, [chainId]);

  const labelsQuery = useQuery({
    queryKey: ['euler', 'earn-labels', chainId],
    queryFn: () => fetchEarnVaultLabels(chainId)
  });
  const entitiesQuery = useQuery({
    queryKey: ['euler', 'entities', chainId],
    queryFn: () => fetchEntities(chainId)
  });
  const intrinsicQuery = useQuery({
    queryKey: ['euler', 'apys-intrinsic', chainId],
    queryFn: () => fetchIntrinsicApys(chainId)
  });

  const activeLabels = useMemo(
    () => (labelsQuery.data ?? []).filter((label) => !label.deprecated && !label.notExplorable),
    [labelsQuery.data]
  );
  const earnAddresses = useMemo(() => activeLabels.map((label) => label.address), [activeLabels]);

  const earnVaultsQuery = useQuery({
    queryKey: ['euler', 'earn-vaults-batch', chainId, earnAddresses],
    enabled: earnAddresses.length > 0,
    queryFn: () => fetchEarnVaultsBatch(chainId, earnAddresses)
  });

  const strategyAddresses = useMemo(
    () =>
      Array.from(
        new Set(
          (earnVaultsQuery.data?.data ?? [])
            .flatMap((vault) => vault.strategies)
            .filter((strategy) => strategy.vaultType === 'evk')
            .map((strategy) => strategy.address)
        )
      ),
    [earnVaultsQuery.data]
  );

  const strategyVaultsQuery = useQuery({
    queryKey: ['euler', 'earn-strategy-vaults', chainId, strategyAddresses],
    enabled: strategyAddresses.length > 0,
    queryFn: () => fetchVaultsBatch(chainId, strategyAddresses)
  });

  const cards = useMemo<EarnVaultCard[]>(() => {
    const labelMap = new Map<string, EulerEarnVaultLabel>(activeLabels.map((label) => [label.address.toLowerCase(), label]));
    const strategyVaultMap = new Map<string, V3VaultDetail>();
    for (const vault of strategyVaultsQuery.data?.data ?? []) {
      strategyVaultMap.set(vault.address.toLowerCase(), vault);
    }
    const intrinsicByAsset = new Map<string, number>();
    for (const apy of intrinsicQuery.data?.data ?? []) {
      intrinsicByAsset.set(apy.address.toLowerCase(), apy.apy);
    }

    return (earnVaultsQuery.data?.data ?? []).map((vault) => {
      const label = labelMap.get(vault.address.toLowerCase());
      const allocator = findAllocator(vault, entitiesQuery.data ?? {});
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
  }, [activeLabels, earnVaultsQuery.data, entitiesQuery.data, intrinsicQuery.data, strategyVaultsQuery.data]);

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
      if (allocatorFilter.length > 0 && !allocatorFilter.includes(vault.allocatorName)) return false;
      if (assetFilter.length > 0 && !assetFilter.includes(vault.asset.symbol)) return false;
      if (exposureFilter.length > 0 && !vault.exposures.some((asset) => exposureFilter.includes(asset.symbol))) return false;
      if (!query) return true;

      return [vault.name, vault.asset.symbol, vault.allocatorName, vault.description, ...vault.exposures.map((asset) => asset.symbol)]
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
  }, [cards, search, allocatorFilter, assetFilter, exposureFilter, sortMode]);

  const loading = labelsQuery.isLoading || earnVaultsQuery.isLoading || strategyVaultsQuery.isLoading || intrinsicQuery.isLoading;
  const error = labelsQuery.error || earnVaultsQuery.error;

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

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 7 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && !!error && (
        <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography color="error">Failed to load Euler Earn data: {(error as Error).message}</Typography>
          <Typography variant="body2" sx={{ color: theme.palette.grey[500], marginTop: 1 }}>
            Labels and vault metrics come directly from the configured public Euler endpoints.
          </Typography>
        </Paper>
      )}

      {!loading && !error && visibleCards.length === 0 && (
        <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography>No Earn vaults match the current filters.</Typography>
        </Paper>
      )}

      {!loading && !error && (
        <Stack spacing={1.25}>
          {visibleCards.map((vault) => (
            <Paper
              component="article"
              key={vault.address}
              role="link"
              tabIndex={0}
              aria-label={`Open ${vault.name}`}
              onClick={() => navigate(`/earn/vault/${vault.address}?network=${chainId}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/earn/vault/${vault.address}?network=${chainId}`);
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
                  logoUrl={tokenImageUrl(chainId, vault.asset.address)}
                  avatarProps={{ sx: { width: 40, height: 40, fontSize: 12 } }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, marginBottom: 0.25 }}>
                    <Typography variant="body2" sx={{ color: theme.palette.grey[500] }} noWrap>
                      {vault.name}
                    </Typography>
                    {vault.tags.map((tag) => (
                      <Chip
                        key={tag}
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
                          <Tooltip key={asset.address} title={asset.symbol} arrow>
                            <Avatar src={tokenImageUrl(chainId, asset.address)} alt={asset.symbol}>
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
