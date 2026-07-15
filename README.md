# Permissionless Euler Interface by cp0x

A permissionless interface for the Euler protocol, built on the Berry MUI template (React 19 + Vite + MUI 7) with wallet connectivity (wagmi + RainbowKit).

The `/explore`, `/earn`, `/lend`, and Earn vault detail pages mirror their app.euler.finance counterparts with live data from Euler's public APIs. Explore renders market cards with supply/borrow/liquidity/ROE stats; Earn renders curated capital allocator vaults and each vault detail includes performance, exposure, management, and real wallet-driven ERC-4626 supply/withdraw flows. Lend lists explorable EVK debt vaults with combined base, intrinsic, and reward APY plus risk manager and collateral exposure. Dashboard, Borrow, and market detail remain boilerplate rendered from mock data in `src/mocks/`.

## Stack

- React 19 + TypeScript + Vite
- MUI 7 (Berry template: theme, layout, ui-components)
- wagmi + viem + RainbowKit (wallet connection, chain switching)
- @tanstack/react-query (Euler API data), Redux Toolkit (snackbar), notistack

## Runtime configuration

`public/config.json` is **not tracked in git** (it holds private RPC keys). Create it once after cloning:

```bash
cp public/config.example.json public/config.json
```

The example ships with public keyless RPCs, which are rate-limited and fine for local development — swap in your own
provider endpoints for anything heavier. All important settings live in `public/config.json`, loaded at runtime before
the app renders (no rebuild needed to change them):

- `eulerApi.v3BaseUrl` — the official public Euler v3 API (`https://v3.euler.finance`): CORS-open, no key required, called directly from the browser. Vault data, APYs, allocations, and prices come from here.
- `eulerApi.labelsBaseUrl` — public `euler-labels` metadata CDN for products, entities, and the curated Earn vault list.
- `eulerApi.labelsImagesBaseUrl` — raw public `euler-labels` assets for curator logos.
- `eulerApi.baseUrl` — base for the remaining internal chain/token metadata endpoints; in dev it is `/euler-api`, a curl-based caching Vite proxy (see `vite.config.mts`).
- `chains[]` — chain list with per-chain `rpcUrl` (Ankr endpoints); these feed both wagmi transports and direct JSON-RPC calls (`rpcCall` in `src/api/euler.ts`).
- `walletConnectProjectId`, `defaultChainId`, `eulerApi.tokenImagesBaseUrl`.

## Euler API layer

`src/api/euler.ts` reproduces the data sources the Euler app uses:

Public v3 API (`v3BaseUrl`, direct from browser):

- `POST /v3/evk/vaults/batch` — vault details incl. collaterals (main Explore data)
- `POST /v3/earn/vaults/batch` — Earn vault summaries and allocation strategies
- `GET /v3/earn/vaults/{chainId}/{address}` — Earn detail, strategies, and governance
- `GET /v3/earn/vaults/{chainId}/{address}/totals` — historical TVL/share-price/APY series
- `GET /v3/evk/vaults?chainId=` — flat vault list (paged, limit ≤ 100)
- `GET /v3/prices`, `GET /v3/apys/{intrinsic,rewards}`

Public labels CDN (`labelsBaseUrl`, direct from browser):

- `GET /{chainId}/{products,entities,earn-vaults}.json` — market grouping, curators, and curated Earn vaults

Internal API via dev proxy (`baseUrl`, retained for metadata not published in the labels repository):

- `GET /internal/euler-chains`, `GET /internal/token-list?chainId=`

Notes: the internal API rate-limits bursts per IP (temporary 403s) — the proxy caches responses and the app keeps traffic low (few queries, 60s react-query cache, single retry). The v3 API blocks obvious bot User-Agents (e.g. python-urllib) but browsers and curl pass.

## Pages

- `/explore?network=1` — Euler markets explorer (live data)
- `/earn?network=1` — curated Earn vaults (live data)
- `/earn/vault/:vaultAddress?network=1` — live vault detail and real ERC-20 approve/ERC-4626 deposit/withdraw transactions
- `/lend?network=1` — isolated EVK lending vaults with live APY, liquidity, utilization, risk manager, and exposure data
- `/lend/:lendAddress?network=1` — lending market detail with live statistics, collateral markets, supply preview, approvals, and ERC-4626 deposit flow
- `/dashboard`, `/borrow` and borrow market details — boilerplate on mock data (`src/mocks/`), action forms show a mock snackbar (`src/components/MockActionForm.tsx`)

## Getting Started

```bash
pnpm install
pnpm start        # dev server (with /euler-api proxy)
pnpm build        # tsc + vite build
pnpm lint         # eslint
```

## Application Links

- Website: [pi.cp0x.com](https://pi.cp0x.com/)
- Twitter: [@cp0xdotcom](https://x.com/cp0xdotcom)
- Telegram: [@cp0xdotcom](https://t.me/cp0xdotcom)

## Contributions

For steps on local deployment, development, and code contribution, please see [CONTRIBUTING](./CONTRIBUTING.md).
