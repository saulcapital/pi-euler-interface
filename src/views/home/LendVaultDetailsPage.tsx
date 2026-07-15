import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Address, formatUnits, isAddress } from 'viem';

import { entityLogoUrl, fetchEntities, fetchProducts, fetchVaultsBatch, tokenImageUrl } from '@/api/euler';
import { useNetworkParam } from 'hooks/useNetworkParam';
import { TokenIcon } from 'components/TokenIcon';
import VaultActionForm from 'components/VaultActionForm';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { EulerEntity, EulerProduct } from 'types/euler';
import { formatShortUSDS } from 'utils/formatters';

function formatUsd(value: number): string {
  return value > 0 && value < 0.01 ? '<$0.01' : `$${formatShortUSDS(value)}`;
}
function rawAmount(raw: string, decimals: number): number {
  try {
    return Number(formatUnits(BigInt(raw), decimals));
  } catch {
    return 0;
  }
}
function addressLabel(address?: string): string {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';
}
function entityForProduct(product: EulerProduct | undefined, entities: Record<string, EulerEntity>): EulerEntity | undefined {
  const slug = product ? (Array.isArray(product.entity) ? product.entity[0] : product.entity) : undefined;
  return slug ? entities[slug] : undefined;
}

export default function LendVaultDetailsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { lendAddress = '' } = useParams<{ lendAddress: string }>();
  const [params] = useSearchParams();
  const [actionTab, setActionTab] = useState(params.get('action') === 'withdraw' ? 1 : 0);
  const { chainId } = useNetworkParam();
  const valid = isAddress(lendAddress);
  const copy = useCopyToClipboard();
  const vaultQuery = useQuery({
    queryKey: ['euler', 'lend-vault-detail', chainId, lendAddress],
    enabled: valid,
    queryFn: () => fetchVaultsBatch(chainId, [lendAddress])
  });
  const productsQuery = useQuery({ queryKey: ['euler', 'products', chainId], queryFn: () => fetchProducts(chainId) });
  const entitiesQuery = useQuery({ queryKey: ['euler', 'entities', chainId], queryFn: () => fetchEntities(chainId) });
  const vault = vaultQuery.data?.data?.[0];
  const product = useMemo(
    () =>
      Object.values(productsQuery.data ?? {}).find((item) =>
        (item.vaults ?? []).some((address) => address.toLowerCase() === lendAddress.toLowerCase())
      ),
    [productsQuery.data, lendAddress]
  );
  const riskManager = entityForProduct(product, entitiesQuery.data ?? {});
  const assetAmount = vault ? rawAmount(vault.totalAssets, vault.asset.decimals) : 0;
  const price = vault && assetAmount > 0 ? vault.totalSupplyUsd / assetAmount : 0;
  const liquidity = vault ? Math.max(vault.totalSupplyUsd - vault.totalBorrowsUsd, 0) : 0;

  if (!valid)
    return (
      <Paper sx={{ padding: 3 }}>
        <Typography color="error">Invalid Lend vault address.</Typography>
      </Paper>
    );
  if (vaultQuery.isLoading)
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
        <CircularProgress />
      </Box>
    );
  if (vaultQuery.error || !vault)
    return (
      <Paper sx={{ padding: 3 }}>
        <Typography color="error">Failed to load Lend market.</Typography>
        <Button sx={{ marginTop: 2 }} onClick={() => navigate(`/lend?network=${chainId}`)} startIcon={<ArrowBackIcon />}>
          Back to Lend
        </Button>
      </Paper>
    );

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, marginBottom: 2.5 }}>
        <IconButton onClick={() => navigate(`/lend?network=${chainId}`)} aria-label="Back to Lend">
          <ArrowBackIcon />
        </IconButton>
        <TokenIcon
          symbol={vault.asset.symbol}
          logoUrl={tokenImageUrl(chainId, vault.asset.address)}
          avatarProps={{ sx: { width: 48, height: 48 } }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography color="text.secondary" noWrap>
            {vault.name}
            <IconButton size="small" onClick={() => copy.copyToClipboard(vault.address)} aria-label="Copy vault address">
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Typography>
          <Typography variant="h2">{vault.asset.symbol}</Typography>
        </Box>
      </Box>
      <Grid container spacing={2.5} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 7 }} sx={{ order: { xs: 2, md: 1 } }}>
          <Stack spacing={2}>
            <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
              <Typography variant="h3" sx={{ marginBottom: 2 }}>
                Overview
              </Typography>
              {product?.description && (
                <Typography color="text.secondary" sx={{ marginBottom: 2 }}>
                  {product.description.replace(/\[([^\]]+)]\([^)]+\)/g, '$1')}
                </Typography>
              )}
              <Grid container spacing={3}>
                <Grid size={{ xs: 6 }}>
                  <Typography color="text.secondary">Price</Typography>
                  <Typography variant="h4">${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography color="text.secondary">Vault type</Typography>
                  <Chip icon={<OpenInNewIcon />} label="Governed" variant="outlined" size="small" />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography color="text.secondary">Market</Typography>
                  <Typography variant="h4">{product?.name ?? vault.name}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography color="text.secondary">Risk manager</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box component="img" src={entityLogoUrl(riskManager?.logo)} sx={{ width: 24, height: 24 }} />
                    <Typography variant="h4">{riskManager?.name ?? '-'}</Typography>
                  </Box>
                </Grid>
              </Grid>
              <Typography color="text.secondary" sx={{ marginTop: 2 }}>
                Can be borrowed
              </Typography>
              <Typography>
                {(vault.collaterals?.length ?? 0) > 0 ? `Yes in ${vault.collaterals?.length} markets` : 'No collateral markets'}
              </Typography>
            </Paper>
            <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
              <Typography variant="h3" sx={{ marginBottom: 2 }}>
                Statistics
              </Typography>
              <Stack spacing={2}>
                <Stat label="Total supply" value={formatUsd(vault.totalSupplyUsd)} />
                <Stat label="Total borrowed" value={formatUsd(vault.totalBorrowsUsd)} />
                <Stat label="Pending bad debt" value="$0" />
                <Stat label="Available liquidity" value={formatUsd(liquidity)} />
                <Stat label="Supply APY" value={`${vault.supplyApy.toFixed(2)}%`} />
                <Stat label="Borrow APY" value={`${vault.borrowApy.toFixed(2)}%`} />
                <Stat label="Utilization" value={`${(vault.utilization * 100).toFixed(2)}%`} />
              </Stack>
            </Paper>
            <Accordion
              defaultExpanded
              sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h3">Collateral markets</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.5}>
                  {(vault.collaterals ?? []).map((collateral) => (
                    <Box
                      key={collateral.collateral}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 2,
                        borderTop: `1px solid ${theme.palette.divider}`,
                        paddingTop: 1.5
                      }}
                    >
                      <Typography>{collateral.collateralName || collateral.collateralSymbol}</Typography>
                      <Typography color="text.secondary">
                        Borrow LTV {(Number(collateral.borrowLTV) / 100).toFixed(2)}% · Liquidation{' '}
                        {(Number(collateral.liquidationLTV) / 100).toFixed(2)}%
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
            <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
              <Typography variant="h3" sx={{ marginBottom: 2 }}>
                Addresses
              </Typography>
              <Stat label="Vault" value={addressLabel(vault.address)} />
              <Stat label={vault.asset.symbol} value={addressLabel(vault.asset.address)} />
            </Paper>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }} sx={{ order: { xs: 1, md: 2 }, position: { md: 'sticky' }, top: { md: 96 } }}>
          <Paper sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: 'hidden' }}>
            <Tabs
              value={actionTab}
              onChange={(_, value) => setActionTab(value)}
              variant="fullWidth"
              sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
            >
              <Tab label="Supply" />
              <Tab label="Withdraw" />
            </Tabs>
            <Box sx={{ padding: 2.5 }}>
              <VaultActionForm
                mode={actionTab === 0 ? 'supply' : 'withdraw'}
                chainId={chainId}
                vaultAddress={vault.address as Address}
                asset={{ address: vault.asset.address as Address, symbol: vault.asset.symbol, decimals: vault.asset.decimals }}
                supplyApy={vault.supplyApy}
                assetPriceUsd={price}
                tokenLogoUrl={tokenImageUrl(chainId, vault.asset.address)}
                onSuccess={() => void vaultQuery.refetch()}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography sx={{ textAlign: 'right' }}>{value}</Typography>
    </Box>
  );
}
