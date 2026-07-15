import { mainnet, base, arbitrum, unichain, polygon, bsc, avalanche, monad, hyperEvm, plasma, linea, Chain } from 'wagmi/chains';
import { http, Transport } from 'viem';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { RuntimeConfig } from '@/appconfig/runtime';

// Every chain Euler runs on (GET https://v3.euler.finance/v3/chains). A chain listed in
// config.json but missing here is dropped from wagmi, so the wallet cannot transact on it.
const KNOWN_CHAINS: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [base.id]: base,
  [arbitrum.id]: arbitrum,
  [unichain.id]: unichain,
  [polygon.id]: polygon,
  [bsc.id]: bsc,
  [avalanche.id]: avalanche,
  [monad.id]: monad,
  [hyperEvm.id]: hyperEvm,
  [plasma.id]: plasma,
  [linea.id]: linea
};

// Wagmi config is derived from the runtime config (public/config.json):
// the chain list and RPC URLs there decide what the wallet connects to.
export function buildWagmiConfig(runtime: RuntimeConfig) {
  const unknown = runtime.chains.filter((c) => !KNOWN_CHAINS[c.chainId]);
  if (unknown.length) {
    console.warn(
      `config.json lists chains with no wagmi definition — the network picker will offer them but the wallet cannot ` +
        `transact there. Add them to KNOWN_CHAINS in src/wagmi-config.ts: ${unknown.map((c) => `${c.label} (${c.chainId})`).join(', ')}`
    );
  }

  const chains = runtime.chains.map((c) => KNOWN_CHAINS[c.chainId]).filter(Boolean) as [Chain, ...Chain[]];

  const transports: Record<number, Transport> = {};
  for (const c of runtime.chains) {
    if (KNOWN_CHAINS[c.chainId]) {
      transports[c.chainId] = http(c.rpcUrl);
    }
  }

  return getDefaultConfig({
    appName: runtime.appName,
    projectId: runtime.walletConnectProjectId || import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000',
    chains,
    transports,
    ssr: false
  });
}
