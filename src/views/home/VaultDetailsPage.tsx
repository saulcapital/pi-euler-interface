import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { formatUnits, isAddress } from 'viem';

import {
  entityLogoUrl,
  fetchEarnVault,
  fetchEarnVaultLabels,
  fetchEarnVaultTotals,
  fetchEntities,
  fetchVaultsBatch,
  tokenImageUrl
} from '@/api/euler';
import { useNetworkParam } from 'hooks/useNetworkParam';
import { CopyableAddress } from 'components/CopyableAddress';
import { TokenIcon } from 'components/TokenIcon';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { EulerEarnTotalsPoint, EulerEarnVault, EulerEntity, V3VaultDetail } from 'types/euler';
import { formatShortUSDS } from 'utils/formatters';
import DepositTab from 'views/home/vault/Deposit';
import WithdrawTab from 'views/home/vault/Withdraw';

type PerformanceMetric = 'totalSupply' | 'apy';
type PerformanceRange = 7 | 30 | 90;

interface PerformanceChartProps {
  points: EulerEarnTotalsPoint[];
  metric: PerformanceMetric;
  range: PerformanceRange;
  assetSymbol: string;
  assetDecimals: number;
}

function rawAmount(raw: string | undefined, decimals: number): number {
  if (!raw) return 0;
  try {
    return Number(formatUnits(BigInt(raw), decimals));
  } catch {
    return 0;
  }
}

function formatUsd(value: number): string {
  if (value > 0 && value < 0.01) return '<$0.01';
  return `$${formatShortUSDS(value)}`;
}

function formatFee(raw: string | undefined): string {
  if (!raw) return '0.00%';
  try {
    return `${(Number(formatUnits(BigInt(raw), 18)) * 100).toFixed(2)}%`;
  } catch {
    return '-';
  }
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return 'None';
  const days = seconds / 86_400;
  if (Number.isInteger(days)) return `${days} ${days === 1 ? 'day' : 'days'}`;
  return `${Math.round(seconds / 3_600)} hours`;
}

function findCurator(vault: EulerEarnVault, entities: Record<string, EulerEntity>): EulerEntity | undefined {
  const curatorAddress = vault.management?.curator.toLowerCase();
  const byAddress = Object.values(entities).find((entity) =>
    Object.values(entity.addresses ?? {}).some((address) => address.toLowerCase() === curatorAddress)
  );
  if (byAddress) return byAddress;

  const name = vault.name.toLowerCase();
  return Object.values(entities)
    .filter((entity) => entity.name && name.includes(entity.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0];
}

function PerformanceChart({ points, metric, range, assetSymbol, assetDecimals }: PerformanceChartProps) {
  const theme = useTheme();
  const visible = points.slice(-range);
  const values = visible.map((point) => (metric === 'totalSupply' ? rawAmount(point.totalAssets, assetDecimals) : (point.apy ?? 0)));

  if (visible.length < 2) {
    return (
      <Box sx={{ height: 240, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
        Historical data is not available for this range.
      </Box>
    );
  }

  const width = 700;
  const height = 260;
  const left = 72;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(...values, 0.000001) * 1.12;
  const minValue = 0;
  const scaleX = (index: number) => left + (index / (visible.length - 1)) * plotWidth;
  const scaleY = (value: number) => top + plotHeight - ((value - minValue) / (maxValue - minValue)) * plotHeight;
  const line = values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${scaleX(index)} ${scaleY(value)}`).join(' ');
  const area = `${line} L ${scaleX(values.length - 1)} ${top + plotHeight} L ${scaleX(0)} ${top + plotHeight} Z`;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => maxValue * ratio);
  const dateIndexes = [0, Math.floor((visible.length - 1) / 2), visible.length - 1];
  const formatValue = (value: number) => (metric === 'totalSupply' ? `${formatShortUSDS(value)} ${assetSymbol}` : `${value.toFixed(2)}%`);

  return (
    <Box sx={{ width: '100%', aspectRatio: '700 / 260', minHeight: 220 }}>
      <Box
        component="svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${metric} history`}
        sx={{ width: '100%', height: '100%' }}
      >
        {gridValues.map((value) => {
          const y = scaleY(value);
          return (
            <g key={value}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke={theme.palette.divider} strokeWidth="1" />
              <text x={left - 8} y={y + 4} textAnchor="end" fill={theme.palette.text.secondary} fontSize="11">
                {formatValue(value)}
              </text>
            </g>
          );
        })}
        <path d={area} fill={alpha(theme.palette.secondary.main, 0.16)} />
        <path d={line} fill="none" stroke={theme.palette.secondary.main} strokeWidth="2.5" strokeLinejoin="round" />
        {dateIndexes.map((index) => (
          <text
            key={index}
            x={scaleX(index)}
            y={height - 12}
            textAnchor={index === 0 ? 'start' : index === visible.length - 1 ? 'end' : 'middle'}
            fill={theme.palette.text.secondary}
            fontSize="11"
          >
            {new Date(visible[index].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        ))}
      </Box>
    </Box>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, minWidth: 0 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box sx={{ minWidth: 0, textAlign: 'right' }}>{value}</Box>
    </Box>
  );
}

function AddressRow({ label, address, chainId }: { label: string; address?: string; chainId: number }) {
  if (!address) return null;
  const explorer = chainId === 1 ? `https://etherscan.io/address/${address}` : undefined;
  return (
    <StatRow
      label={label}
      value={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <CopyableAddress address={address} />
          {explorer && (
            <Tooltip title="Open in explorer">
              <IconButton component={Link} href={explorer} target="_blank" rel="noreferrer" size="small">
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      }
    />
  );
}

const accordionSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  boxShadow: 'none',
  '&:before': { display: 'none' },
  '&.Mui-expanded': { margin: 0 }
};

export default function VaultDetailsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { vaultAddress = '' } = useParams<{ vaultAddress: string }>();
  const [searchParams] = useSearchParams();
  const { chainId } = useNetworkParam();
  const addressValid = isAddress(vaultAddress);
  const [actionTab, setActionTab] = useState(searchParams.get('action') === 'withdraw' ? 1 : 0);
  const [performanceMetric, setPerformanceMetric] = useState<PerformanceMetric>('totalSupply');
  const [performanceRange, setPerformanceRange] = useState<PerformanceRange>(30);
  const { copySuccessMsg, copyToClipboard } = useCopyToClipboard();

  const detailQuery = useQuery({
    queryKey: ['euler', 'earn-vault', chainId, vaultAddress],
    enabled: addressValid,
    queryFn: () => fetchEarnVault(chainId, vaultAddress)
  });
  const labelsQuery = useQuery({
    queryKey: ['euler', 'earn-labels', chainId],
    queryFn: () => fetchEarnVaultLabels(chainId)
  });
  const entitiesQuery = useQuery({
    queryKey: ['euler', 'entities', chainId],
    queryFn: () => fetchEntities(chainId)
  });

  const historyWindow = useMemo(() => {
    const to = Math.ceil(Date.now() / 1000) + 86_400;
    return { from: to - 91 * 86_400, to };
  }, []);
  const totalsQuery = useQuery({
    queryKey: ['euler', 'earn-vault-totals', chainId, vaultAddress, historyWindow],
    enabled: addressValid,
    queryFn: () => fetchEarnVaultTotals(chainId, vaultAddress, historyWindow.from, historyWindow.to)
  });

  const vault = detailQuery.data?.data;
  const strategyAddresses = useMemo(
    () => vault?.strategies.filter((strategy) => strategy.vaultType === 'evk').map((strategy) => strategy.address) ?? [],
    [vault]
  );
  const strategyVaultsQuery = useQuery({
    queryKey: ['euler', 'earn-vault-strategies', chainId, strategyAddresses],
    enabled: strategyAddresses.length > 0,
    queryFn: () => fetchVaultsBatch(chainId, strategyAddresses)
  });

  const strategyVaults = useMemo(() => {
    const map = new Map<string, V3VaultDetail>();
    for (const strategy of strategyVaultsQuery.data?.data ?? []) map.set(strategy.address.toLowerCase(), strategy);
    return map;
  }, [strategyVaultsQuery.data]);

  const curator = vault ? findCurator(vault, entitiesQuery.data ?? {}) : undefined;
  const label = labelsQuery.data?.find((entry) => entry.address.toLowerCase() === vaultAddress.toLowerCase());
  const totalAssets = vault ? rawAmount(vault.totalAssets, vault.asset.decimals) : 0;
  const assetPriceUsd = vault && totalAssets > 0 ? vault.totalSupplyUsd / totalAssets : 0;
  const tokenLogo = vault ? tokenImageUrl(chainId, vault.asset.address) : '';
  const currentApy = vault?.supplyApy ?? totalsQuery.data?.data.current.apy ?? null;

  const refreshAfterTransaction = () => {
    void detailQuery.refetch();
    void totalsQuery.refetch();
  };

  if (!addressValid) {
    return (
      <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Typography color="error">Invalid Earn vault address.</Typography>
      </Paper>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!vault || detailQuery.error) {
    return (
      <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Typography color="error">Failed to load Earn vault: {(detailQuery.error as Error)?.message ?? 'Vault not found'}</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/earn?network=${chainId}`)} sx={{ marginTop: 2 }}>
          Back to Earn
        </Button>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, marginBottom: 2.5 }}>
        <Tooltip title="Back to Earn">
          <IconButton onClick={() => navigate(`/earn?network=${chainId}`)} aria-label="Back to Earn">
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <TokenIcon symbol={vault.asset.symbol} logoUrl={tokenLogo} avatarProps={{ sx: { width: 48, height: 48 } }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }} noWrap>
              {vault.name}
            </Typography>
            <Tooltip title={copySuccessMsg || 'Copy vault link'}>
              <IconButton size="small" onClick={() => copyToClipboard(window.location.href)} aria-label="Copy vault link">
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="h2">{vault.asset.symbol}</Typography>
        </Box>
      </Box>

      <Grid container spacing={2.5} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 7 }} sx={{ order: { xs: 2, md: 1 } }}>
          <Stack spacing={2}>
            <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
              <Typography variant="h3" sx={{ marginBottom: 2.5 }}>
                Overview
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', marginBottom: 0.75 }}>
                    Price
                  </Typography>
                  <Typography variant="h4">${assetPriceUsd.toFixed(2)}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', marginBottom: 0.75 }}>
                    Performance fee
                  </Typography>
                  <Typography variant="h4">{formatFee(vault.management?.performanceFee)}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', marginBottom: 0.75 }}>
                    Curator
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Avatar
                      src={entityLogoUrl(curator?.logo)}
                      alt={curator?.name ?? 'Curator'}
                      sx={{ width: 24, height: 24, fontSize: 10 }}
                    >
                      {(curator?.name ?? 'C').slice(0, 1)}
                    </Avatar>
                    <Typography variant="h4">{curator?.name ?? 'Unknown'}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', marginBottom: 0.75 }}>
                    Vault type
                  </Typography>
                  <Chip icon={<AccountBalanceOutlinedIcon />} label="Curated" variant="outlined" size="small" />
                </Grid>
              </Grid>
              {label?.description && (
                <Typography variant="body2" sx={{ color: 'text.secondary', marginTop: 2.5 }}>
                  {label.description.replace(/\[([^\]]+)]\([^)]+\)/g, '$1')}
                </Typography>
              )}
            </Paper>

            <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
              <Typography variant="h3" sx={{ marginBottom: 2.5 }}>
                Statistics
              </Typography>
              <Stack spacing={2.25}>
                <StatRow label="Total supply" value={<Typography>{formatUsd(vault.totalSupplyUsd)}</Typography>} />
                <StatRow label="Available liquidity" value={<Typography>{formatUsd(vault.availableAssetsUsd ?? 0)}</Typography>} />
                <StatRow label="Total strategies" value={<Typography>{vault.strategyCount}</Typography>} />
                <StatRow label="Supply APY" value={<Typography>{currentApy == null ? '-' : `${currentApy.toFixed(2)}%`}</Typography>} />
              </Stack>
            </Paper>

            <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h3">Performance</Typography>
                <Select
                  size="small"
                  value={performanceMetric}
                  onChange={(event) => setPerformanceMetric(event.target.value as PerformanceMetric)}
                >
                  <MenuItem value="totalSupply">Total supply</MenuItem>
                  <MenuItem value="apy">APY</MenuItem>
                </Select>
              </Box>
              {totalsQuery.isLoading ? (
                <Box sx={{ height: 260, display: 'grid', placeItems: 'center' }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <PerformanceChart
                  points={totalsQuery.data?.data.history ?? []}
                  metric={performanceMetric}
                  range={performanceRange}
                  assetSymbol={vault.asset.symbol}
                  assetDecimals={vault.asset.decimals}
                />
              )}
              <ToggleButtonGroup
                exclusive
                size="small"
                value={performanceRange}
                onChange={(_, value: PerformanceRange | null) => value && setPerformanceRange(value)}
                aria-label="Performance range"
              >
                <ToggleButton value={7}>7D</ToggleButton>
                <ToggleButton value={30}>30D</ToggleButton>
                <ToggleButton value={90}>90D</ToggleButton>
              </ToggleButtonGroup>
            </Paper>

            <Accordion defaultExpanded sx={accordionSx}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h3">Exposure</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ paddingTop: 0 }}>
                <Stack divider={<Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }} />}>
                  {vault.strategies.map((strategy) => {
                    const strategyVault = strategyVaults.get(strategy.address.toLowerCase());
                    const allocation = vault.totalSupplyUsd > 0 ? (strategy.allocatedAssetsUsd / vault.totalSupplyUsd) * 100 : 0;
                    return (
                      <Grid key={strategy.address} container spacing={2} sx={{ paddingY: 2 }} alignItems="center">
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Typography variant="body1" noWrap>
                            {strategy.name ?? strategy.symbol ?? 'Strategy'}
                          </Typography>
                          <Chip label={strategy.status.replace('_', ' ')} size="small" variant="outlined" sx={{ marginTop: 0.75 }} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Allocation
                          </Typography>
                          <Typography>{allocation.toFixed(2)}%</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Supplied
                          </Typography>
                          <Typography>{formatUsd(strategy.allocatedAssetsUsd)}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }} sx={{ textAlign: { sm: 'right' } }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', marginBottom: 0.5 }}>
                            Collateral exposure
                          </Typography>
                          {(strategyVault?.collaterals?.filter((collateral) => collateral.asset && collateral.assetSymbol).length ?? 0) >
                          0 ? (
                            <AvatarGroup
                              max={6}
                              sx={{ justifyContent: { sm: 'flex-end' }, '& .MuiAvatar-root': { width: 26, height: 26, fontSize: 9 } }}
                            >
                              {strategyVault?.collaterals
                                ?.filter((collateral) => collateral.asset && collateral.assetSymbol)
                                .map((collateral) => (
                                  <Tooltip key={collateral.asset} title={collateral.assetSymbol}>
                                    <Avatar src={tokenImageUrl(chainId, collateral.asset)} alt={collateral.assetSymbol}>
                                      {collateral.assetSymbol?.slice(0, 2)}
                                    </Avatar>
                                  </Tooltip>
                                ))}
                            </AvatarGroup>
                          ) : (
                            <Typography>-</Typography>
                          )}
                        </Grid>
                      </Grid>
                    );
                  })}
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={accordionSx}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h3">Management</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2.25}>
                  <AddressRow label="Owner" address={vault.management?.owner} chainId={chainId} />
                  <AddressRow label="Curator" address={vault.management?.curator} chainId={chainId} />
                  <AddressRow label="Guardian" address={vault.management?.guardian} chainId={chainId} />
                  <AddressRow label="Fee recipient" address={vault.management?.feeRecipient} chainId={chainId} />
                  <StatRow label="Timelock" value={<Typography>{formatDuration(vault.management?.timelockSeconds)}</Typography>} />
                  <StatRow label="Performance fee" value={<Typography>{formatFee(vault.management?.performanceFee)}</Typography>} />
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={accordionSx}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h3">Addresses</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2.25}>
                  <AddressRow label="Vault" address={vault.address} chainId={chainId} />
                  <AddressRow label={vault.asset.symbol} address={vault.asset.address} chainId={chainId} />
                  <AddressRow label="Creator" address={vault.governance?.creator} chainId={chainId} />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }} sx={{ order: { xs: 1, md: 2 }, position: { md: 'sticky' }, top: { md: 96 } }}>
          <Paper sx={{ padding: 2.5, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
            <Tabs
              value={actionTab}
              onChange={(_, value) => setActionTab(value)}
              variant="fullWidth"
              aria-label="Earn vault actions"
              sx={{ marginBottom: 2.5 }}
            >
              <Tab label="Supply" />
              <Tab label="Withdraw" />
            </Tabs>
            {actionTab === 0 ? (
              <DepositTab
                vaultAddress={vault.address}
                vaultData={vault}
                chainId={chainId}
                assetPriceUsd={assetPriceUsd}
                tokenLogoUrl={tokenLogo}
                onSuccess={refreshAfterTransaction}
              />
            ) : (
              <WithdrawTab
                vaultAddress={vault.address}
                vaultData={vault}
                chainId={chainId}
                assetPriceUsd={assetPriceUsd}
                tokenLogoUrl={tokenLogo}
                onSuccess={refreshAfterTransaction}
              />
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
