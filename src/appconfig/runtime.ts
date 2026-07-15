// Runtime configuration loaded from public/config.json before the app renders.
// Edit config.json (no rebuild needed) to change API endpoints, chains, and RPC URLs.

export interface RuntimeChainConfig {
  chainId: number;
  name: string;
  label: string;
  rpcUrl: string;
}

export interface RuntimeConfig {
  appName: string;
  defaultChainId: number;
  eulerApi: {
    // remaining internal metadata endpoints — same-origin only, needs the dev proxy
    baseUrl: string;
    // official public v3 API (CORS-open) — called directly from the browser
    v3BaseUrl: string;
    tokenImagesBaseUrl: string;
    // public euler-labels CDN for JSON metadata
    labelsBaseUrl: string;
    // public euler-labels repository for binary logo assets
    labelsImagesBaseUrl: string;
  };
  walletConnectProjectId: string;
  chains: RuntimeChainConfig[];
}

let runtimeConfig: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const res = await fetch('/config.json', { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`Failed to load /config.json: ${res.status}`);
  }
  runtimeConfig = (await res.json()) as RuntimeConfig;
  return runtimeConfig;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!runtimeConfig) {
    throw new Error('Runtime config is not loaded yet — call loadRuntimeConfig() first');
  }
  return runtimeConfig;
}

export function getChainConfig(chainId: number): RuntimeChainConfig | undefined {
  return getRuntimeConfig().chains.find((c) => c.chainId === chainId);
}
