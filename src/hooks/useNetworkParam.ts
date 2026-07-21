import { useSearchParams } from 'react-router-dom';

import { getRuntimeConfig } from '@/appconfig/runtime';

interface UseNetworkParam {
  /** The network for a chain-specific detail or action route. */
  chainId: number;
}

/**
 * Resolves the chain encoded in a detail/action URL. Discovery pages query every configured
 * chain and do not use this parameter. An absent, malformed, or unconfigured chain falls
 * back to `defaultChainId`, so detail pages cannot query an unsupported chain.
 */
export function useNetworkParam(): UseNetworkParam {
  const [searchParams] = useSearchParams();
  const { chains, defaultChainId } = getRuntimeConfig();

  // `chainId` is accepted as a legacy alias for links that predate `network`.
  const requested = Number(searchParams.get('network') ?? searchParams.get('chainId'));
  const chainId = chains.some((chain) => chain.chainId === requested) ? requested : defaultChainId;

  return { chainId };
}
