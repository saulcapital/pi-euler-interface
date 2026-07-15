import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import { useAccount, useSwitchChain } from 'wagmi';

import { useNetworkParam } from 'hooks/useNetworkParam';
import { getChainName } from 'utils/chains';

interface NetworkSelectorProps {
  fullWidth?: boolean;
  minWidth?: number;
}

/**
 * Global network picker (header). Drives `?network=`, which every page reads, and pulls a
 * connected wallet along to the same chain so the two cannot silently diverge.
 *
 * The wallet is still free to sit on another chain (the user can reject the switch, or switch
 * in the wallet itself), so a mismatch is surfaced here — RainbowKit's own "Wrong network"
 * button is hidden by `chainStatus="none"` in the header.
 */
export default function NetworkSelector({ fullWidth = false, minWidth = 140 }: NetworkSelectorProps) {
  const { chainId, setChainId, chains } = useNetworkParam();
  const { isConnected, chainId: walletChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const mismatch = isConnected && walletChainId !== undefined && walletChainId !== chainId;

  const applyChain = async (value: number) => {
    setChainId(value);

    if (!isConnected) return;
    try {
      await switchChainAsync({ chainId: value });
    } catch {
      // Browsing a network the wallet is not on is allowed — the action forms prompt for the
      // switch at transaction time, so a rejected or unsupported switch must not block the view.
    }
  };

  const select = (
    <Select
      size="small"
      value={chainId}
      onChange={(event) => applyChain(Number(event.target.value))}
      fullWidth={fullWidth}
      sx={{
        minWidth,
        ...(mismatch && { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'warning.main', borderWidth: 2 } })
      }}
      inputProps={{ 'aria-label': 'Network' }}
    >
      {chains.map((chain) => (
        <MenuItem key={chain.chainId} value={chain.chainId}>
          {chain.label}
        </MenuItem>
      ))}
    </Select>
  );

  if (!mismatch) return select;

  return (
    <Tooltip
      arrow
      title={`Your wallet is on ${getChainName(walletChainId)} while you are browsing ${getChainName(chainId)} — you will be asked to switch when you transact.`}
    >
      {select}
    </Tooltip>
  );
}
