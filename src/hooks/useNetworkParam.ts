import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getRuntimeConfig, RuntimeChainConfig } from '@/appconfig/runtime';

interface UseNetworkParam {
  /** The network being browsed — always one of the configured chains. */
  chainId: number;
  /** Switch the browsed network, preserving every other query param. */
  setChainId: (chainId: number) => void;
  chains: RuntimeChainConfig[];
}

/**
 * Single source of truth for the browsed network, held in the `?network=` query param
 * (mirroring app.euler.finance). An absent, malformed, or unconfigured chain falls back
 * to `defaultChainId`, so no page can query an unsupported chain.
 */
export function useNetworkParam(): UseNetworkParam {
  const [searchParams, setSearchParams] = useSearchParams();
  const { chains, defaultChainId } = getRuntimeConfig();

  // `chainId` is accepted as a legacy alias for links that predate `network`.
  const requested = Number(searchParams.get('network') ?? searchParams.get('chainId'));
  const chainId = chains.some((chain) => chain.chainId === requested) ? requested : defaultChainId;

  const setChainId = useCallback(
    (value: number) => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('network', String(value));
        next.delete('chainId');
        return next;
      });
    },
    [setSearchParams]
  );

  return { chainId, setChainId, chains };
}
