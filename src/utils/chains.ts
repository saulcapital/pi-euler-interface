import { getChainConfig } from '@/appconfig/runtime';

/**
 * Chain display name, read from the runtime config so it cannot drift from the chains the app
 * is actually configured for — public/config.json is the single source of truth.
 */
export const getChainName = (chainId: number): string => {
  try {
    return getChainConfig(chainId)?.label ?? `Chain ${chainId}`;
  } catch {
    // Runtime config is loaded before render, so this only trips if a caller runs pre-bootstrap.
    return `Chain ${chainId}`;
  }
};
