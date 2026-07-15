import { createRoot } from 'react-dom/client';

// third party
import { Provider } from 'react-redux';

// project imports
import App from 'App';
import { store } from 'store';
import * as serviceWorker from 'serviceWorker';
import reportWebVitals from 'reportWebVitals';
import { ConfigProvider } from 'contexts/ConfigContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { Buffer } from 'buffer';
import RainbowKitThemeProvider from 'components/RainbowKitThemeProvider';
import { loadRuntimeConfig } from '@/appconfig/runtime';
import { buildWagmiConfig } from './wagmi-config';

// style + assets
import 'assets/scss/style.scss';

// google-fonts
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/700.css';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

globalThis.Buffer = Buffer;

// Conservative defaults: the Euler API rate-limits bursts, so avoid
// aggressive retries/refetches and keep responses cached for a while.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 3000,
      staleTime: 60_000,
      refetchOnWindowFocus: false
    }
  }
});

// ==============================|| REACT DOM RENDER ||============================== //

const container = document.getElementById('root');
const root = createRoot(container!);

async function bootstrap() {
  // Runtime config (public/config.json) must be loaded before anything renders:
  // wagmi transports and the Euler API base URL come from it.
  const runtime = await loadRuntimeConfig();
  const wagmiConfig = buildWagmiConfig(runtime);

  root.render(
    <Provider store={store}>
      <ConfigProvider>
        <WagmiProvider reconnectOnMount={false} config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitThemeProvider>
              <App />
            </RainbowKitThemeProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ConfigProvider>
    </Provider>
  );
}

bootstrap().catch((err) => {
  console.error(err);
  root.render(<div style={{ padding: 24, fontFamily: 'sans-serif' }}>Failed to load app configuration: {String(err)}</div>);
});

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
