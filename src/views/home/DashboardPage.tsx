import React from 'react';

import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { DECIMALS_SCALE_FACTOR, formatShortUSDS, formatTokenAmount, shortenAddress } from 'utils/formatters';
import { formatUnits } from 'viem';
import { TokenIcon } from 'components/TokenIcon';
import { getChainName } from 'utils/chains';
import { mockChainPositions } from 'mocks/positions';

export default function DashboardPage() {
  const navigate = useNavigate();

  // Mock data: user positions grouped by chain (see src/mocks/positions.ts)
  const chainsWithData = mockChainPositions;

  return (
    <Box sx={{ width: '100%' }}>
      {chainsWithData.length === 0 && (
        <Box sx={{ padding: 2 }}>
          <Typography variant="h4">No positions found across any network.</Typography>
        </Box>
      )}

      {chainsWithData.map(({ chainId, marketPositions, vaultPositions }) => (
        <Box key={chainId} sx={{ marginBottom: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, marginBottom: 2 }}>
            <Typography variant="h2">{getChainName(chainId)}</Typography>
          </Box>

          {vaultPositions.length > 0 && (
            <Box sx={{ marginBottom: 3 }}>
              <Typography variant="h4" gutterBottom sx={{ marginBottom: 1, color: 'text.secondary' }}>
                Vaults
              </Typography>
              <TableContainer component={Paper} sx={{ marginBottom: 2 }}>
                <Table sx={{ minWidth: 650 }} aria-label="vaults table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Vault</TableCell>
                      <TableCell>Balance</TableCell>
                      <TableCell>APY</TableCell>
                      <TableCell>Total Deposits (USD)</TableCell>
                      <TableCell>Curators</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vaultPositions.map((position) => (
                      <TableRow
                        key={position.vault.address}
                        hover
                        onClick={() => navigate(`/earn/vault/${position.vault.address}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TokenIcon symbol={position.vault.asset.symbol} />
                            {position.vault.name || shortenAddress(position.vault.address)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {Number(formatUnits(BigInt(position.state.assets), position.vault.asset.decimals)).toFixed(6)} (
                          {Number(position.state.assetsUsd).toFixed(2)} $)
                        </TableCell>
                        <TableCell>{(Number(position.vault.state.avgNetApy ?? 0) * 100).toFixed(2)} %</TableCell>
                        <TableCell>$ {formatShortUSDS(position.vault.state.totalAssetsUsd)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {position.vault.state.curators?.map((curator) => (
                              <Box key={curator.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {curator.name ? curator.name : curator.id}
                              </Box>
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {marketPositions.length > 0 && (
            <Box>
              <Typography variant="h4" gutterBottom sx={{ marginBottom: 1, color: 'text.secondary' }}>
                Markets
              </Typography>
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="markets table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Market</TableCell>
                      <TableCell>Collateral</TableCell>
                      <TableCell>Loan</TableCell>
                      <TableCell>Borrow APY</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {marketPositions.map((position) => (
                      <TableRow
                        key={position.marketId}
                        hover
                        onClick={() => navigate(`/borrow/market/${position.marketId}?chainId=${chainId}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          {position.collateralSymbol}/{position.loanSymbol}
                        </TableCell>
                        <TableCell>
                          {parseFloat(position.collateralBalance) > 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TokenIcon symbol={position.collateralSymbol} />
                              {formatTokenAmount(
                                position.collateralBalance,
                                position.collateralDecimal,
                                position.collateralDecimal / DECIMALS_SCALE_FACTOR
                              )}{' '}
                              {position.collateralSymbol}
                            </Box>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {parseFloat(position.loanBalance) > 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TokenIcon symbol={position.loanSymbol} />
                              {formatTokenAmount(
                                position.loanBalance,
                                position.loanDecimal,
                                position.loanDecimal / DECIMALS_SCALE_FACTOR
                              )}{' '}
                              {position.loanSymbol}
                            </Box>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{(Number(position.borrowApy) * 100).toFixed(2)} %</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
