import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import {
  Autocomplete,
  Avatar,
  AvatarGroup,
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
import SearchIcon from '@mui/icons-material/Search';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { entityLogoUrl, fetchEntities, fetchProducts, fetchVaultsBatch, fetchIntrinsicApys, tokenImageUrl } from '@/api/euler';
import ExploreMarketExperience, { type ExploreResolvedSummary } from 'features/explore/ExploreMarketExperience';
import { V3VaultDetail } from 'types/euler';
import { formatShortUSDS } from 'utils/formatters';
import { useNetworkParam } from 'hooks/useNetworkParam';

type SortMode = 'active' | 'name' | 'totalSupply' | 'totalBorrowed' | 'maxRoe';

interface ProductCard {
  slug: string;
  name: string;
  description: string;
  entityNames: string[];
  entityLogo?: string;
  totalSupplyUsd: number;
  totalBorrowedUsd: number;
  availableLiquidityUsd: number;
  assetCount: number;
  pairCount: number;
  unknownVaults: number;
  maxRoe: number | null;
  maxRoePair: string | null;
  assets: { address: string; symbol: string }[];
  memberAddresses: string[];
  vaults: V3VaultDetail[];
}

export default function ExplorePage() {
  const theme = useTheme();
  const { chainId } = useNetworkParam();

  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('active');
  const [entityFilter, setEntityFilter] = useState<string[]>([]);
  const [assetFilter, setAssetFilter] = useState<string[]>([]);
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(new Set());
  const [resolvedSummaries, setResolvedSummaries] = useState<Record<string, ExploreResolvedSummary>>({});

  // Filters and expansion state name entities/assets of one chain — they cannot carry over.
  useEffect(() => {
    setEntityFilter([]);
    setAssetFilter([]);
    setExpandedSlugs(new Set());
    setResolvedSummaries({});
  }, [chainId]);
  const toggleExpanded = (slug: string) =>
    setExpandedSlugs((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  const updateResolvedSummary = useCallback((slug: string, summary: ExploreResolvedSummary) => {
    setResolvedSummaries((previous) => {
      const current = previous[slug];
      if (
        current &&
        Object.keys(summary).every((key) => current[key as keyof ExploreResolvedSummary] === summary[key as keyof ExploreResolvedSummary])
      ) {
        return previous;
      }
      return { ...previous, [slug]: summary };
    });
  }, []);

  const productsQuery = useQuery({ queryKey: ['euler', 'products', chainId], queryFn: () => fetchProducts(chainId) });
  const entitiesQuery = useQuery({ queryKey: ['euler', 'entities', chainId], queryFn: () => fetchEntities(chainId) });
  const intrinsicQuery = useQuery({ queryKey: ['euler', 'apys-intrinsic', chainId], queryFn: () => fetchIntrinsicApys(chainId) });

  // Vault details come from the public v3 batch endpoint, for the addresses
  // referenced by the products of this chain (dependent query).
  const vaultAddresses = useMemo(() => {
    const products = productsQuery.data;
    if (!products) return [] as string[];
    return Array.from(new Set(Object.values(products).flatMap((p) => p.vaults ?? [])));
  }, [productsQuery.data]);

  const vaultsQuery = useQuery({
    queryKey: ['euler', 'vaults-batch', chainId, vaultAddresses],
    enabled: vaultAddresses.length > 0,
    queryFn: () => fetchVaultsBatch(chainId, vaultAddresses)
  });

  const cards: ProductCard[] = useMemo(() => {
    const products = productsQuery.data;
    const vaultsResp = vaultsQuery.data;
    if (!products || !vaultsResp) return [];

    const entities = entitiesQuery.data ?? {};
    const vaultMap = new Map<string, V3VaultDetail>();
    for (const v of vaultsResp.data ?? []) {
      if (v?.address) vaultMap.set(v.address.toLowerCase(), v);
    }

    const intrinsicByAsset = new Map<string, number>();
    for (const a of intrinsicQuery.data?.data ?? []) {
      intrinsicByAsset.set(a.address.toLowerCase(), a.apy);
    }

    return Object.entries(products).map(([slug, product]) => {
      const entitySlugs = (Array.isArray(product.entity) ? product.entity : [product.entity]).filter(Boolean) as string[];
      const productSet = new Set(product.vaults.map((a) => a.toLowerCase()));
      const vaults = product.vaults.map((a) => vaultMap.get(a.toLowerCase())).filter(Boolean) as V3VaultDetail[];
      const unknownVaults = product.vaults.length - vaults.length;

      let totalSupplyUsd = 0;
      let totalBorrowedUsd = 0;
      let availableLiquidityUsd = 0;
      const assets = new Map<string, string>();
      let pairCount = 0;
      let maxRoe: number | null = null;
      let maxRoePair: string | null = null;

      for (const v of vaults) {
        totalSupplyUsd += v.totalSupplyUsd || 0;
        totalBorrowedUsd += v.totalBorrowsUsd || 0;
        availableLiquidityUsd += Math.max((v.totalSupplyUsd || 0) - (v.totalBorrowsUsd || 0), 0);
        assets.set(v.asset.address.toLowerCase(), v.asset.symbol);

        // Pairs: (collateral vault, debt vault) combos inside the product.
        // Max ROE approximates a max-leverage loop at the pair's borrow LTV:
        // lev = 1/(1-ltv); roe = lev*supplyAPY(coll) - (lev-1)*borrowAPY(debt).
        for (const c of v.collaterals ?? []) {
          const collateral = vaultMap.get(c.collateral.toLowerCase());
          if (!collateral || !productSet.has(c.collateral.toLowerCase())) continue;
          pairCount += 1;
          const ltv = Number(c.borrowLTV) / 10_000; // basis points
          if (!ltv || ltv >= 1) continue;
          const collSupplyApy = (collateral.supplyApy ?? 0) + (intrinsicByAsset.get(collateral.asset.address.toLowerCase()) ?? 0);
          const debtBorrowApy = v.borrowApy ?? 0;
          const lev = 1 / (1 - ltv);
          const roe = lev * collSupplyApy - (lev - 1) * debtBorrowApy;
          if (maxRoe === null || roe > maxRoe) {
            maxRoe = roe;
            maxRoePair = `${collateral.asset.symbol}/${v.asset.symbol}`;
          }
        }
      }

      return {
        slug,
        name: product.name || slug,
        description: product.description || '',
        entityNames: entitySlugs.map((e) => entities[e]?.name ?? e),
        entityLogo: entityLogoUrl(entities[entitySlugs[0]]?.logo),
        totalSupplyUsd,
        totalBorrowedUsd,
        availableLiquidityUsd,
        assetCount: assets.size,
        pairCount,
        unknownVaults,
        maxRoe,
        maxRoePair,
        assets: Array.from(assets, ([address, symbol]) => ({ address, symbol })),
        memberAddresses: product.vaults,
        vaults
      };
    });
  }, [productsQuery.data, entitiesQuery.data, vaultsQuery.data, intrinsicQuery.data]);

  const entityOptions = useMemo(() => Array.from(new Set(cards.flatMap((c) => c.entityNames))).sort(), [cards]);
  const assetOptions = useMemo(() => Array.from(new Set(cards.flatMap((c) => c.assets.map((a) => a.symbol)))).sort(), [cards]);

  const visibleCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = cards.filter((c) => {
      if (entityFilter.length > 0 && !c.entityNames.some((e) => entityFilter.includes(e))) return false;
      if (assetFilter.length > 0 && !c.assets.some((a) => assetFilter.includes(a.symbol))) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.entityNames.some((e) => e.toLowerCase().includes(q)) ||
        c.assets.some((a) => a.symbol.toLowerCase().includes(q))
      );
    });

    return filtered.sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'totalBorrowed':
          return b.totalBorrowedUsd - a.totalBorrowedUsd;
        case 'maxRoe':
          return (b.maxRoe ?? -Infinity) - (a.maxRoe ?? -Infinity);
        case 'totalSupply':
        case 'active':
        default:
          return b.totalSupplyUsd - a.totalSupplyUsd;
      }
    });
  }, [cards, search, sortMode, entityFilter, assetFilter]);

  const loading = productsQuery.isLoading || vaultsQuery.isLoading;
  const error = productsQuery.error || vaultsQuery.error;

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 3, marginTop: 1 }}>
        <Avatar variant="rounded" sx={{ width: 56, height: 56, bgcolor: 'transparent', border: `1px solid ${theme.palette.divider}` }}>
          <HubOutlinedIcon sx={{ color: theme.palette.secondary.main }} />
        </Avatar>
        <Box>
          <Typography variant="h2">Explore</Typography>
          <Typography variant="body1" sx={{ color: theme.palette.grey[500] }}>
            Discover lending markets across Euler. Filter by asset, risk manager, or market type.
          </Typography>
        </Box>
      </Box>

      {/* Toolbar: search / sort / filters — the network lives in the header picker */}
      <Grid container spacing={1.5} sx={{ marginBottom: 3 }} alignItems="center">
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by asset, market, curator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Select fullWidth size="small" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="totalSupply">Total supply</MenuItem>
            <MenuItem value="totalBorrowed">Total borrowed</MenuItem>
            <MenuItem value="maxRoe">Max ROE</MenuItem>
          </Select>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Autocomplete
            multiple
            size="small"
            options={entityOptions}
            value={entityFilter}
            onChange={(e, v) => setEntityFilter(v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip label={option} {...getTagProps({ index })} size="small" />)
            }
            renderInput={(params) => <TextField {...params} label="Risk manager" />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Autocomplete
            multiple
            size="small"
            options={assetOptions}
            value={assetFilter}
            onChange={(e, v) => setAssetFilter(v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip label={option} {...getTagProps({ index })} size="small" />)
            }
            renderInput={(params) => <TextField {...params} label="Asset" />}
          />
        </Grid>
      </Grid>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && !!error && (
        <Paper sx={{ padding: 3 }}>
          <Typography color="error">Failed to load Euler data: {(error as Error).message}</Typography>
          <Typography variant="body2" sx={{ color: theme.palette.grey[500], marginTop: 1 }}>
            The Euler API is reachable through the dev proxy (see eulerApi.baseUrl in public/config.json).
          </Typography>
        </Paper>
      )}

      {!loading && !error && visibleCards.length === 0 && (
        <Paper sx={{ padding: 3 }}>
          <Typography>No markets match the current filters.</Typography>
        </Paper>
      )}

      <Stack spacing={2}>
        {visibleCards.map((card) => {
          const resolved = resolvedSummaries[card.slug];
          return (
            <Paper
              key={card.slug}
              sx={{
                padding: '20px 24px',
                border: `1px solid ${theme.palette.divider}`,
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: theme.palette.secondary.main }
              }}
            >
              <Box
                onClick={() => toggleExpanded(card.slug)}
                sx={{ cursor: 'pointer' }}
                role="button"
                aria-expanded={expandedSlugs.has(card.slug)}
              >
                {/* Top: entity, name, description | assets/pairs */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, marginBottom: 2.5 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', minWidth: 0 }}>
                    <Avatar src={card.entityLogo} sx={{ width: 44, height: 44, fontSize: 16 }}>
                      {(card.entityNames[0] || card.name).slice(0, 1)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ color: theme.palette.grey[500] }}>
                        {card.entityNames.join(' & ')}
                      </Typography>
                      <Typography variant="h3" sx={{ margin: '2px 0' }}>
                        {card.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: theme.palette.grey[500],
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: { xs: 2, sm: 1 },
                          overflow: 'hidden'
                        }}
                      >
                        {card.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexShrink: 0 }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ color: theme.palette.grey[400] }}>
                        {resolved?.assetCount ?? card.assetCount} assets
                      </Typography>
                      <Typography variant="body2" sx={{ color: theme.palette.grey[500] }}>
                        {resolved?.pairCount ?? card.pairCount} pairs
                      </Typography>
                      {(resolved?.unknownVaults ?? card.unknownVaults) > 0 && (
                        <Typography variant="body2" color="error">
                          {resolved?.unknownVaults ?? card.unknownVaults} unknown
                        </Typography>
                      )}
                    </Box>
                    <ExpandMoreIcon
                      sx={{
                        color: theme.palette.grey[500],
                        transition: 'transform 0.2s',
                        transform: expandedSlugs.has(card.slug) ? 'rotate(180deg)' : 'none'
                      }}
                    />
                  </Box>
                </Box>

                {/* Bottom: stats | asset icon cluster */}
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
                    <Typography variant="body2" sx={{ color: theme.palette.grey[500] }}>
                      Total supply
                    </Typography>
                    <Typography variant="h4">${formatShortUSDS(resolved?.totalSupplyUsd ?? card.totalSupplyUsd)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
                    <Typography variant="body2" sx={{ color: theme.palette.grey[500] }}>
                      Total borrowed
                    </Typography>
                    <Typography variant="h4">${formatShortUSDS(resolved?.totalBorrowedUsd ?? card.totalBorrowedUsd)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
                    <Typography variant="body2" sx={{ color: theme.palette.grey[500] }}>
                      Available liquidity
                    </Typography>
                    <Typography variant="h4">${formatShortUSDS(resolved?.availableLiquidityUsd ?? card.availableLiquidityUsd)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3, md: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ color: theme.palette.grey[500] }}>
                        Max ROE
                      </Typography>
                      <Tooltip title="Estimated max return on equity for a leveraged loop at the pair's borrow LTV" arrow>
                        <InfoOutlinedIcon sx={{ fontSize: 14, color: theme.palette.grey[600] }} />
                      </Tooltip>
                    </Box>
                    {card.maxRoe !== null ? (
                      <Typography variant="h4">
                        {card.maxRoe.toFixed(2)}%{' '}
                        <Typography component="span" variant="body2" sx={{ color: theme.palette.grey[500] }}>
                          {card.maxRoePair}
                        </Typography>
                      </Typography>
                    ) : (
                      <Typography variant="h4" sx={{ color: theme.palette.grey[600] }}>
                        —
                      </Typography>
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 12, md: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: { md: 'flex-end', xs: 'flex-start' } }}>
                      <AvatarGroup
                        max={8}
                        sx={{ '& .MuiAvatar-root': { width: 26, height: 26, fontSize: 10, border: `1px solid ${theme.palette.divider}` } }}
                      >
                        {card.assets.map((a) => (
                          <Tooltip key={a.address} title={a.symbol} arrow>
                            <Avatar src={tokenImageUrl(chainId, a.address)} alt={a.symbol}>
                              {a.symbol.slice(0, 2).toUpperCase()}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
              {expandedSlugs.has(card.slug) && (
                <Box sx={{ marginTop: 2.5, paddingTop: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                  <ExploreMarketExperience
                    chainId={chainId}
                    marketId={card.slug}
                    memberAddresses={card.memberAddresses}
                    vaults={card.vaults}
                    onResolvedSummary={(summary) => updateResolvedSummary(card.slug, summary)}
                  />
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
