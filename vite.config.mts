import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';
import { spawn } from 'node:child_process';

// Dev proxy for the Euler API: /euler-api/* -> https://app.euler.finance/api/*.
// Cloudflare in front of app.euler.finance rejects node's TLS fingerprint
// (plain http-proxy gets a permanent 403), while curl passes — so the proxy
// shells out to curl. The path prefix is configurable at runtime via
// public/config.json (eulerApi.baseUrl).
function eulerApiProxy(): Plugin {
  const TARGET = 'https://app.euler.finance/api';
  const FALLBACK_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  // The API rate-limits bursts per IP (a handful of requests per window bans
  // the IP for ~10 min), so upstream requests are strictly serialized with a
  // spacing interval, identical concurrent GETs are deduplicated, and GET
  // responses are cached (fresh for CACHE_TTL_MS) with stale served on 403/5xx.
  const CACHE_TTL_MS = 5 * 60_000;
  const MIN_INTERVAL_MS = 2_000;
  const cache = new Map<string, { ts: number; contentType: string; body: Buffer }>();
  const inflight = new Map<string, Promise<UpstreamResult>>();
  let queueTail: Promise<unknown> = Promise.resolve();
  let lastUpstreamAt = 0;

  interface UpstreamResult {
    status: number;
    contentType: string;
    body: Buffer;
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  function curlUpstream(method: string, url: string, ua: string, postBody: Buffer | null): Promise<UpstreamResult> {
    return new Promise((resolve) => {
      const args = ['-s', '-D', '-', '--max-time', '30', '-H', `User-Agent: ${ua}`, '-H', 'Accept: application/json'];
      if (method === 'POST') {
        args.push('-X', 'POST', '-H', 'Content-Type: application/json', '--data-binary', '@-');
      }
      args.push(url);

      const cp = spawn('curl', args, { stdio: ['pipe', 'pipe', 'ignore'] });
      if (postBody) cp.stdin.end(postBody);
      else cp.stdin.end();

      const chunks: Buffer[] = [];
      cp.stdout.on('data', (c: Buffer) => chunks.push(c));
      cp.on('close', (code) => {
        if (code !== 0) {
          resolve({ status: 502, contentType: 'application/json', body: Buffer.from(JSON.stringify({ error: true, message: `euler-api proxy: curl exited with ${code}` })) });
          return;
        }
        const raw = Buffer.concat(chunks);
        const sep = raw.indexOf('\r\n\r\n');
        const head = raw.subarray(0, sep).toString('utf8');
        resolve({
          status: Number(head.match(/^HTTP\/[\d.]+\s+(\d+)/)?.[1] ?? 502),
          contentType: head.match(/^content-type:\s*(.+)$/im)?.[1]?.trim() ?? 'application/json',
          body: raw.subarray(sep + 4)
        });
      });
      cp.on('error', () => {
        resolve({ status: 502, contentType: 'application/json', body: Buffer.from(JSON.stringify({ error: true, message: 'euler-api proxy: failed to spawn curl' })) });
      });
    });
  }

  // Serialize all upstream calls with MIN_INTERVAL_MS spacing between them
  function enqueueUpstream(method: string, url: string, ua: string, postBody: Buffer | null): Promise<UpstreamResult> {
    const run = queueTail.then(async () => {
      const wait = lastUpstreamAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await sleep(wait);
      lastUpstreamAt = Date.now();
      return curlUpstream(method, url, ua, postBody);
    });
    queueTail = run.catch(() => undefined);
    return run;
  }

  return {
    name: 'euler-api-proxy',
    configureServer(server) {
      server.middlewares.use('/euler-api', (req, res) => {
        const url = `${TARGET}${req.url}`;
        const method = req.method || 'GET';
        const cacheable = method === 'GET';
        const cached = cacheable ? cache.get(url) : undefined;
        const ua = (req.headers['user-agent'] as string) || FALLBACK_UA;

        const respond = (status: number, contentType: string, body: Buffer) => {
          res.statusCode = status;
          res.setHeader('Content-Type', contentType);
          res.end(body);
        };

        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
          respond(200, cached.contentType, cached.body);
          return;
        }

        const bodyChunks: Buffer[] = [];
        req.on('data', (c: Buffer) => bodyChunks.push(c));
        req.on('end', () => {
          const postBody = method === 'POST' ? Buffer.concat(bodyChunks) : null;

          // Deduplicate identical concurrent GETs into one upstream call
          let result: Promise<UpstreamResult>;
          const flightKey = cacheable ? url : null;
          if (flightKey && inflight.has(flightKey)) {
            result = inflight.get(flightKey)!;
          } else {
            result = enqueueUpstream(method, url, ua, postBody);
            if (flightKey) {
              inflight.set(flightKey, result);
              result.finally(() => inflight.delete(flightKey));
            }
          }

          result.then((r) => {
            if (r.status >= 400 && cached) {
              respond(200, cached.contentType, cached.body);
              return;
            }
            if (r.status === 200 && cacheable) {
              cache.set(url, { ts: Date.now(), contentType: r.contentType, body: r.body });
            }
            respond(r.status, r.contentType, r.body);
          });
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // depending on your application, base can also be "/"
  const env = loadEnv(mode, process.cwd(), '');
  // const API_URL = `${env.VITE_APP_BASE_NAME}`;
  const API_URL = '/';
  const PORT = 3000;

  return {
    server: {
      // this ensures that the browser opens upon server start
      open: true,
      // this sets a default port to 3000
      port: PORT,
      host: true
    },
    build: {
      chunkSizeWarningLimit: 1600
    },
    preview: {
      open: true,
      host: true
    },
    define: {
      global: 'window'
    },
    resolve: {
      alias: {
        // { find: '', replacement: path.resolve(__dirname, 'src') },
        // {
        //   find: /^~(.+)/,
        //   replacement: path.join(process.cwd(), 'node_modules/$1')
        // },
        // {
        //   find: /^src(.+)/,
        //   replacement: path.join(process.cwd(), 'src/$1')
        // }
        // {
        //   find: 'assets',
        //   replacement: path.join(process.cwd(), 'src/assets')
        // },
        '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs'
      }
    },
    base: API_URL,
    plugins: [
      eulerApiProxy(),
      react(),
      tsconfigPaths(),
      svgr({
        svgrOptions: {
          icon: true,
          exportType: 'named',
        },
        include: '**/*.svg',
      })
    ]
  };
});
