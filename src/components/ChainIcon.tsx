import { Avatar, AvatarProps, Tooltip } from '@mui/material';
import Box, { BoxProps } from '@mui/material/Box';
import React from 'react';
import { getChainName } from 'utils/chains';

interface ChainIconProps extends BoxProps {
  chainId: number;
  showName?: boolean;
  avatarProps?: AvatarProps;
}

// Placeholder icon: renders a letter avatar from the chain name.
// Swap in real icon sources (e.g. /chains/<chainId>.jpg) when wiring a protocol.
export const ChainIcon: React.FC<ChainIconProps> = ({ chainId, showName = false, avatarProps, ...boxProps }) => {
  if (!chainId) return null;

  const name = getChainName(chainId);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} {...boxProps}>
      <Tooltip title={name} arrow>
        <Avatar alt={name} sx={{ width: 24, height: 24, fontSize: 12, ...avatarProps?.sx }} {...avatarProps}>
          {name.slice(0, 1).toUpperCase()}
        </Avatar>
      </Tooltip>
      {showName && name}
    </Box>
  );
};
