import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, CircularProgress, Grid, Paper, Stack, Tab, Tabs, Typography, useTheme } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { formatUnits } from 'viem';
import { useAccount } from 'wagmi';

import { fetchAccountPortfolio, tokenImageUrl } from '@/api/euler';
import { useNetworkParam } from 'hooks/useNetworkParam';
import ConnectButtonCustom from 'components/ConnectButtonCustom';
import { TokenIcon } from 'components/TokenIcon';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { EulerBorrowPosition, EulerDepositPosition } from 'types/euler';
import { formatShortUSDS } from 'utils/formatters';

function fmtUsd(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value > 0 && value < 0.01) return '<$0.01';
  return `$${formatShortUSDS(value)}`;
}
function rawAmount(raw: string, decimals: number): number {
  try {
    return Number(formatUnits(BigInt(raw), decimals));
  } catch {
    return 0;
  }
}
function shortAddress(address?: string): string {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';
}
function fixed1e18(value: string): number {
  try {
    return Number(formatUnits(BigInt(value), 18));
  } catch {
    return 0;
  }
}

export default function PortfolioPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const copy = useCopyToClipboard();
  const { address } = useAccount();
  const { chainId } = useNetworkParam();
  const [tab, setTab] = useState(0);

  const portfolioQuery = useQuery({
    queryKey: ['euler', 'portfolio', chainId, address],
    enabled: Boolean(address),
    queryFn: () => fetchAccountPortfolio(chainId, address as string),
    refetchInterval: 30_000
  });

  const healthColor = (hf: number) =>
    hf >= 2 ? theme.palette.success.main : hf >= 1.25 ? theme.palette.warning.main : theme.palette.error.main;

  if (!address)
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 360, textAlign: 'center', gap: 2 }}>
        <Typography variant="h2">Your portfolio</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
          Connect your wallet to view your Euler borrow positions and deposits, and to manage them.
        </Typography>
        <ConnectButtonCustom />
      </Box>
    );

  if (portfolioQuery.isLoading)
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
        <CircularProgress />
      </Box>
    );

  const portfolio = portfolioQuery.data?.data?.portfolio;
  if (portfolioQuery.error || !portfolio)
    return (
      <Paper sx={{ padding: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Typography color="error">Failed to load your portfolio. Please try again in a moment.</Typography>
      </Paper>
    );

  const totals = portfolio.totals;
  const borrows = portfolio.borrows ?? [];
  const deposits = portfolio.savings ?? [];

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2.5, flexWrap: 'wrap' }}>
        <Typography variant="h2">Portfolio</Typography>
        <Chip
          size="small"
          variant="outlined"
          label={shortAddress(address)}
          onDelete={() => copy.copyToClipboard(address)}
          deleteIcon={<ContentCopyIcon sx={{ fontSize: 15 }} />}
        />
      </Box>

      {/* Summary */}
      <Grid container spacing={2} sx={{ marginBottom: 3 }}>
        <SummaryStat label="Net worth" value={fmtUsd(totals?.netAssetValueUsd ?? 0)} />
        <SummaryStat label="Supplied" value={fmtUsd(totals?.suppliedValueUsd ?? 0)} />
        <SummaryStat label="Borrowed" value={fmtUsd(totals?.borrowedValueUsd ?? 0)} />
        <SummaryStat
          label="Net APY"
          value={`${(totals?.netApy ?? 0).toFixed(2)}%`}
          valueColor={(totals?.netApy ?? 0) >= 0 ? theme.palette.success.main : theme.palette.error.main}
        />
      </Grid>

      <Paper sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, px: 1 }}>
          <Tab label={`Positions${borrows.length ? ` (${borrows.length})` : ''}`} />
          <Tab label={`Deposits${deposits.length ? ` (${deposits.length})` : ''}`} />
        </Tabs>
        <Box sx={{ padding: { xs: 1.5, sm: 2.5 } }}>
          {tab === 0 ? (
            borrows.length === 0 ? (
              <EmptyState text="You have no open borrow positions on this network." />
            ) : (
              <Stack spacing={1.5}>
                {borrows.map((position) => (
                  <PositionRow
                    key={`${position.collateralVault.address}-${position.borrowVault.address}-${position.subAccount}`}
                    chainId={chainId}
                    position={position}
                    healthColor={healthColor}
                    onManage={() =>
                      navigate(`/portfolio/position/${position.collateralVault.address}/${position.borrowVault.address}?network=${chainId}`)
                    }
                  />
                ))}
              </Stack>
            )
          ) : deposits.length === 0 ? (
            <EmptyState text="You have no deposits on this network." />
          ) : (
            <Stack spacing={1.5}>
              {deposits.map((deposit) => (
                <DepositRow
                  key={`${deposit.vault.address}-${deposit.subAccount}`}
                  chainId={chainId}
                  deposit={deposit}
                  onSupply={() => navigate(depositHref(deposit, chainId, 'supply'))}
                  onWithdraw={() => navigate(depositHref(deposit, chainId, 'withdraw'))}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

function depositHref(deposit: EulerDepositPosition, chainId: number, action: 'supply' | 'withdraw'): string {
  const isEarn = deposit.vault.type === 'EulerEarn';
  const base = isEarn ? `/earn/vault/${deposit.vault.address}` : `/lend/${deposit.vault.address}`;
  return `${base}?network=${chainId}&action=${action}`;
}

function SummaryStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const theme = useTheme();
  return (
    <Grid size={{ xs: 6, md: 3 }}>
      <Paper sx={{ padding: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, height: '100%' }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h3" sx={{ marginTop: 0.5, color: valueColor }}>
          {value}
        </Typography>
      </Paper>
    </Grid>
  );
}

function PositionRow({
  chainId,
  position,
  healthColor,
  onManage
}: {
  chainId: number;
  position: EulerBorrowPosition;
  healthColor: (hf: number) => string;
  onManage: () => void;
}) {
  const theme = useTheme();
  const collateral = position.collateralVault;
  const borrow = position.borrowVault;
  const hf = fixed1e18(position.healthFactor);
  const ltv = fixed1e18(position.currentLTV) * 100;
  const netValue = (position.totalCollateralValueUsd ?? 0) - (position.liabilityValueUsd ?? 0);
  return (
    <Paper
      variant="outlined"
      onClick={onManage}
      sx={{
        padding: 2,
        borderRadius: 1,
        borderColor: theme.palette.divider,
        cursor: 'pointer',
        transition: 'border-color .15s',
        '&:hover': { borderColor: theme.palette.secondary.main }
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TokenIcon
              symbol={collateral.asset.symbol}
              logoUrl={tokenImageUrl(chainId, collateral.asset.address)}
              avatarProps={{ sx: { width: 32, height: 32, fontSize: 11 } }}
            />
            <ArrowForwardIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
            <TokenIcon
              symbol={borrow.asset.symbol}
              logoUrl={tokenImageUrl(chainId, borrow.asset.address)}
              avatarProps={{ sx: { width: 32, height: 32, fontSize: 11 } }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" noWrap>
                {collateral.asset.symbol} → {borrow.asset.symbol}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Borrow position
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Metric label="Net value" value={fmtUsd(netValue)} />
        <Metric label="Debt" value={fmtUsd(position.liabilityValueUsd ?? 0)} />
        <Metric label="Health" value={Number.isFinite(hf) && hf > 0 ? hf.toFixed(2) : '∞'} valueColor={healthColor(hf)} />
        <Metric
          label="Net APY"
          value={`${(position.netApy ?? 0).toFixed(2)}%`}
          valueColor={(position.netApy ?? 0) >= 0 ? theme.palette.success.main : theme.palette.error.main}
          extra={`LTV ${ltv.toFixed(1)}%`}
        />
        <Grid size={{ xs: 12, md: 1 }} sx={{ textAlign: { md: 'right' } }}>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={(event) => {
              event.stopPropagation();
              onManage();
            }}
          >
            Manage
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}

function DepositRow({
  chainId,
  deposit,
  onSupply,
  onWithdraw
}: {
  chainId: number;
  deposit: EulerDepositPosition;
  onSupply: () => void;
  onWithdraw: () => void;
}) {
  const theme = useTheme();
  const isEarn = deposit.vault.type === 'EulerEarn';
  const assets = rawAmount(deposit.assets, deposit.vault.asset.decimals);
  return (
    <Paper variant="outlined" sx={{ padding: 2, borderRadius: 1, borderColor: theme.palette.divider }}>
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TokenIcon
              symbol={deposit.vault.asset.symbol}
              logoUrl={tokenImageUrl(chainId, deposit.vault.asset.address)}
              avatarProps={{ sx: { width: 32, height: 32, fontSize: 11 } }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="h5" noWrap>
                  {deposit.vault.shares.symbol}
                </Typography>
                <Chip label={isEarn ? 'Earn' : 'Lend'} size="small" color={isEarn ? 'secondary' : 'default'} variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {deposit.vault.asset.symbol}
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Metric
          label="Balance"
          value={fmtUsd(deposit.suppliedValueUsd ?? 0)}
          extra={`${assets.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${deposit.vault.asset.symbol}`}
        />
        <Metric label="APY" value={`${(deposit.apy ?? 0).toFixed(2)}%`} valueColor={theme.palette.success.main} />
        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}>
          <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
            <Button size="small" variant="contained" color="secondary" onClick={onSupply}>
              Supply
            </Button>
            <Button size="small" variant="outlined" color="secondary" onClick={onWithdraw}>
              Withdraw
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}

function Metric({ label, value, valueColor, extra }: { label: string; value: string; valueColor?: string; extra?: string }) {
  return (
    <Grid size={{ xs: 4, md: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ color: valueColor }}>
        {value}
      </Typography>
      {extra && (
        <Typography variant="caption" color="text.secondary">
          {extra}
        </Typography>
      )}
    </Grid>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 160, textAlign: 'center' }}>
      <Typography color="text.secondary">{text}</Typography>
    </Box>
  );
}
