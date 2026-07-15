import Box, { BoxProps } from '@mui/material/Box';
import { Avatar, AvatarProps } from '@mui/material';
import React from 'react';

interface TokenIconProps extends BoxProps {
  symbol: string;
  logoUrl?: string; // real icon source; letter avatar is the fallback
  avatarProps?: AvatarProps; // lets callers customise the Avatar
}

// Renders the token logo when logoUrl is given (e.g. token-images.euler.finance),
// otherwise a letter avatar from the token symbol.
export const TokenIcon: React.FC<TokenIconProps> = ({ symbol, logoUrl, avatarProps, ...boxProps }) => {
  if (!symbol) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} {...boxProps}>
      <Avatar src={logoUrl} alt={`${symbol} icon`} sx={{ width: 36, height: 36, fontSize: 14, ...avatarProps?.sx }} {...avatarProps}>
        {symbol.slice(0, 2).toUpperCase()}
      </Avatar>
    </Box>
  );
};
