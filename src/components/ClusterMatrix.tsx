import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { tokenImageUrl } from '@/api/euler';
import { TokenIcon } from 'components/TokenIcon';
import { V3Collateral, V3VaultDetail } from 'types/euler';

interface ClusterMatrixProps {
  chainId: number;
  vaults: V3VaultDetail[];
}

interface Row {
  vault: string; // collateral vault address
  asset: string; // underlying asset address (for the icon)
  symbol: string;
}

function pct(basisPoints: string): string {
  return `${(Number(basisPoints) / 100).toFixed(0)}%`;
}

// The LTV matrix inside a market (cluster): rows are collateral assets, columns are borrowable
// assets, and each cell shows the max borrow LTV. Clicking an active cell reveals the Lend/Borrow
// destinations for that specific (collateral, liability) record.
export default function ClusterMatrix({ chainId, vaults }: ClusterMatrixProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<{ collateral: string; liability: string } | null>(null);

  const { rows, columns, cells } = useMemo(() => {
    const columns = vaults.filter((vault) => (vault.collaterals?.length ?? 0) > 0);
    const rowMap = new Map<string, Row>();
    const cells = new Map<string, V3Collateral>(); // key `${collateralAddr}|${liabilityAddr}`
    for (const debt of columns) {
      for (const collateral of debt.collaterals ?? []) {
        const collateralKey = collateral.collateral.toLowerCase();
        if (!rowMap.has(collateralKey)) {
          rowMap.set(collateralKey, {
            vault: collateral.collateral,
            asset: collateral.asset,
            symbol: collateral.assetSymbol || collateral.collateralSymbol
          });
        }
        cells.set(`${collateralKey}|${debt.address.toLowerCase()}`, collateral);
      }
    }
    return { rows: Array.from(rowMap.values()), columns, cells };
  }, [vaults]);

  const cellFor = (collateralVault: string, liabilityVault: string) =>
    cells.get(`${collateralVault.toLowerCase()}|${liabilityVault.toLowerCase()}`);

  if (columns.length === 0 || rows.length === 0)
    return (
      <Typography variant="body2" color="text.secondary">
        No borrowable collateral pairs in this market.
      </Typography>
    );

  const selectedDebt = selected ? columns.find((vault) => vault.address.toLowerCase() === selected.liability.toLowerCase()) : undefined;
  const selectedColl = selected ? rows.find((row) => row.vault.toLowerCase() === selected.collateral.toLowerCase()) : undefined;
  const selectedCell = selected ? cellFor(selected.collateral, selected.liability) : undefined;
  const go = (path: string) => navigate(`${path}?network=${chainId}`);
  const stickyCol = { position: 'sticky' as const, left: 0, zIndex: 1, backgroundColor: theme.palette.background.paper };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Max LTV by collateral (row) and borrowed asset (column). Click a cell for its lend &amp; borrow pages.
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 420, '& td, & th': { borderColor: theme.palette.divider } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={stickyCol}>
                <Typography variant="caption" color="text.secondary">
                  Collateral \ Borrow
                </Typography>
              </TableCell>
              {columns.map((debt) => (
                <TableCell key={debt.address} align="center">
                  <Stack alignItems="center" spacing={0.5}>
                    <TokenIcon
                      symbol={debt.asset.symbol}
                      logoUrl={tokenImageUrl(chainId, debt.asset.address)}
                      avatarProps={{ sx: { width: 22, height: 22, fontSize: 9 } }}
                    />
                    <Typography variant="caption">{debt.asset.symbol}</Typography>
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.vault} hover>
                <TableCell sx={stickyCol}>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <TokenIcon
                      symbol={row.symbol}
                      logoUrl={tokenImageUrl(chainId, row.asset)}
                      avatarProps={{ sx: { width: 22, height: 22, fontSize: 9 } }}
                    />
                    <Typography variant="body2" noWrap>
                      {row.symbol}
                    </Typography>
                  </Stack>
                </TableCell>
                {columns.map((debt) => {
                  const cell = cellFor(row.vault, debt.address);
                  const isSelected =
                    selected &&
                    selected.collateral.toLowerCase() === row.vault.toLowerCase() &&
                    selected.liability.toLowerCase() === debt.address.toLowerCase();
                  if (!cell)
                    return (
                      <TableCell key={debt.address} align="center" sx={{ color: theme.palette.text.disabled }}>
                        ·
                      </TableCell>
                    );
                  return (
                    <Tooltip
                      key={debt.address}
                      title={`Borrow LTV ${pct(cell.borrowLTV)} · Liquidation LTV ${pct(cell.liquidationLTV)}`}
                      arrow
                    >
                      <TableCell
                        align="center"
                        onClick={() => setSelected(isSelected ? null : { collateral: row.vault, liability: debt.address })}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                          backgroundColor: isSelected ? alpha(theme.palette.secondary.main, 0.18) : undefined,
                          '&:hover': { backgroundColor: alpha(theme.palette.secondary.main, 0.1) }
                        }}
                      >
                        {pct(cell.borrowLTV)}
                      </TableCell>
                    </Tooltip>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {selected && selectedDebt && selectedColl && selectedCell && (
        <Paper variant="outlined" sx={{ mt: 2, p: 2, borderColor: theme.palette.secondary.main, borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            <Typography variant="subtitle1">
              {selectedColl.symbol} → {selectedDebt.asset.symbol}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              label={`Max LTV ${pct(selectedCell.borrowLTV)} · Liq ${pct(selectedCell.liquidationLTV)}`}
            />
          </Box>
          <Stack spacing={1}>
            <LinkRow
              label={`Borrow ${selectedDebt.asset.symbol} against ${selectedColl.symbol}`}
              onClick={() => go(`/borrow/${selected.collateral}/${selected.liability}`)}
            />
            <LinkRow label={`Lend ${selectedDebt.asset.symbol}`} onClick={() => go(`/lend/${selected.liability}`)} />
            <LinkRow label={`Lend ${selectedColl.symbol}`} onClick={() => go(`/lend/${selected.collateral}`)} />
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

function LinkRow({ label, onClick }: { label: string; onClick: () => void }) {
  const theme = useTheme();
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        px: 1.5,
        py: 1,
        borderRadius: 1,
        cursor: 'pointer',
        border: `1px solid ${theme.palette.divider}`,
        transition: 'border-color .15s, background-color .15s',
        '&:hover': { borderColor: theme.palette.secondary.main, backgroundColor: alpha(theme.palette.secondary.main, 0.06) }
      }}
    >
      <Typography variant="body2">{label}</Typography>
      <ArrowForwardIcon sx={{ fontSize: 16, color: theme.palette.secondary.main }} />
    </Box>
  );
}
