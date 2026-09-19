import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserProvider, formatUnits, isAddress, parseEther } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import AllAssetsReview from './AllAssetsReview';
import './styles.css';

declare global { interface Window { ethereum?: any } }

const chains = [
  { id: 1, name: 'Ethereum', native: 'ETH', explorer: 'https://etherscan.io/tx/', tokenApi: 'https://eth.blockscout.com/api/v2', rpcUrl: 'https://eth.llamarpc.com' }, { id: 10, name: 'OP Mainnet', native: 'ETH', explorer: 'https://optimistic.etherscan.io/tx/', tokenApi: 'https://optimism.blockscout.com/api/v2', rpcUrl: 'https://optimism.llamarpc.com' },
  { id: 56, name: 'BNB Smart Chain', native: 'BNB', explorer: 'https://bscscan.com/tx/', rpcUrl: 'https://bsc-dataseed.binance.org' }, { id: 100, name: 'Gnosis', native: 'xDAI', explorer: 'https://gnosis.blockscout.com/tx/', tokenApi: 'https://gnosis.blockscout.com/api/v2', rpcUrl: 'https://rpc.gnosischain.com' },
  { id: 137, name: 'Polygon', native: 'POL', explorer: 'https://polygonscan.com/tx/', tokenApi: 'https://polygon.blockscout.com/api/v2', rpcUrl: 'https://polygon-rpc.com' }, { id: 143, name: 'Monad', native: 'MON', explorer: 'https://monadscan.com/tx/', rpcUrl: 'https://monad-rpc.publicnode.com' },
  { id: 130, name: 'Unichain', native: 'ETH', explorer: 'https://uniscan.xyz/tx/', tokenApi: 'https://unichain.blockscout.com/api/v2', rpcUrl: 'https://mainnet.unichain.org' }, { id: 1868, name: 'Soneium', native: 'ETH', explorer: 'soneium.blockscout.com/tx/', tokenApi: 'https://soneium.blockscout.com/api/v2', rpcUrl: 'https://rpc.soneium.org' },
  { id: 42161, name: 'Arbitrum One', native: 'ETH', explorer: 'https://arbiscan.io/tx/', tokenApi: 'https://arbitrum.blockscout.com/api/v2', rpcUrl: 'https://arbitrum-one.publicnode.com' }, { id: 43114, name: 'Avalanche C-Chain', native: 'AVAX', explorer: 'https://snowtrace.io/tx/', tokenApi: 'https://avalanche.blockscout.com/api/v2', rpcUrl: 'https://avalanche-c-chain-rpc.publicnode.com' },
  { id: 8453, name: 'Base', native: 'ETH', explorer: 'https://basescan.org/tx/', tokenApi: 'https://base.blockscout.com/api/v2', rpcUrl: 'https://mainnet.base.org' }, { id: 999, name: 'HyperEVM', native: 'HYPE', explorer: 'https://hyperevm.publicnode.com', rpcUrl: 'https://rpc.hyperliquid.xyz/evm' },
];
type WalletApp = 'metamask' | 'trust' | 'coinbase';
type WalletConnectProvider = Awaited<ReturnType<typeof EthereumProvider.init>>;
type TokenAsset = { chainId: number; chainName: string; address: string; name: string; symbol: string; decimals: number; balance: string; kind: 'native' | 'erc20' };
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
  const response = await fetch(`${chain.tokenApi}/addresses/${address}/token-balances?type=ERC-20&limit=1000`);
  if (!response.ok) throw new Error(`${chain.name} token indexer returned ${response.status}`);
  const data = await response.json() as any[];
  return data.filter(item => item?.token?.address && item?.value && item.value !== '0').map(item => {
    const token = item.token;
    const decimals = Number(token.decimals ?? 18);
    let balance = item.value as string;
    try { balance = formatUnits(item.value, decimals); } catch { /* keep raw value */ }
    return { chainId: chain.id, chainName: chain.name, address: token.address, name: token.name || 'Unknown token', symbol: token.symbol || 'TOKEN', decimals, balance, kind: 'erc20' as const };
  });
}

async function discoverNativeAsset(chain: typeof chains[number], address: string): Promise<TokenAsset | null> {
  if (!chain.rpcUrl) throw new Error(`${chain.name} does not have a read-only RPC configured.`);
  const provider = new BrowserProvider(new (class {
    request(args: { method: string; params?: any[] }) {
      return fetch(chain.rpcUrl!, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: args.method, params: args.params ?? [] }) })
        .then(async response => {
          if (!response.ok) throw new Error(`RPC returned HTTP ${response.status}`);
          const payload = await response.json();
          if (payload.error) throw new Error(payload.error.message || 'RPC request failed');
          return payload.result;
        });
    }
  }) as any);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== chain.id) throw new Error(`Read-only RPC resolved to an unexpected network for ${chain.name}.`);
  const rawBalance = await provider.getBalance(address);
  if (rawBalance <= 0n) return null;
  return { chainId: chain.id, chainName: chain.name, address: 'native', name: chain.native, symbol: chain.native, decimals: 18, balance: formatUnits(rawBalance, 18), kind: 'native' };
}

function App() {
  const [address, setAddress] = useState(''); const [destination, setDestination] = useState(''); const [amount, setAmount] = useState('');
  const [connectedChain, setConnectedChain] = useState<number | null>(null); const [selectedChain, setSelectedChain] = useState<number | null>(null);
  const [status, setStatus] = useState('Connect your wallet to begin.'); const [recoveryStep, setRecoveryStep] = useState(1);
  const [preview, setPreview] = useState(false); const [txHash, setTxHash] = useState(''); const [busy, setBusy] = useState(false);
  const [tokens, setTokens] = useState<TokenAsset[]>([]); const [scanning, setScanning] = useState(false); const [scanErrors, setScanErrors] = useState<string[]>([]); const [scanSummary, setScanSummary] = useState<{scanned:number; successful:number; assets:number}>({scanned:0,successful:0,assets:0});
  const [handoffApp, setHandoffApp] = useState<WalletApp | null>(null); const [handoffPending, setHandoffPending] = useState(false); const timer = useRef<number | null>(null);
  const mobile = isMobileBrowser(); const activeChainId = selectedChain ?? connectedChain; const chainInfo = useMemo(() => chains.find(c => c.id === activeChainId), [activeChainId]);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  async function scanWalletTokens(walletAddress = address) {
    if (!walletAddress || !isAddress(walletAddress)) return;
    setScanning(true); setScanErrors([]); setTokens([]); setScanSummary({scanned: chains.length, successful: 0, assets: 0});
    setStatus('Scanning all supported networks with read-only access…');
    const errors: string[] = [];
    const found: TokenAsset[] = [];
    let successful = 0;
    await Promise.all(chains.map(async chain => {
      try {
        const native = await discoverNativeAsset(chain, walletAddress);
        if (native) found.push(native);
        if (chain.tokenApi) {
          try { found.push(...await discoverTokens(chain, walletAddress)); }
          catch (e) { errors.push(`${chain.name}: token indexer unavailable (${e instanceof Error ? e.message : 'scan failed'})`); }
        }
        successful += 1;
      } catch (e) {
        errors.push(`${chain.name}: network scan unavailable (${e instanceof Error ? e.message : 'RPC scan failed'})`);
      }
    }));
    const unique = new Map<string, TokenAsset>();
    for (const token of found) unique.set(`${token.chainId}:${token.address.toLowerCase()}`, token);
    const result = [...unique.values()].sort((a,b) => a.chainId - b.chainId || a.symbol.localeCompare(b.symbol));
    setTokens(result); setScanErrors(errors); setScanSummary({scanned: chains.length, successful, assets: result.length});
    if (errors.length === 0) setStatus(`Portfolio scan complete: ${result.length} non-zero asset${result.length === 1 ? '' : 's'} found across ${successful} networks.`);
    else setStatus(`Portfolio scan completed with ${errors.length} network/indexer issue${errors.length === 1 ? '' : 's'}. Review the diagnostics below.`);
    setScanning(false);
  }
  async function finishConnection(eip1193: any, existingAccount?: string) {
    const provider = new BrowserProvider(eip1193);
    const accounts = existingAccount ? [existingAccount] : await provider.send('eth_requestAccounts', []);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    setAddress(accounts[0] ?? ''); setConnectedChain(chainId); setSelectedChain(chainId); setTokens([]); setScanErrors([]); setScanSummary({scanned:0,successful:0,assets:0}); setRecoveryStep(accounts[0] ? 2 : 1); setStatus(accounts[0] ? 'Wallet connected. Scanning all supported networks…' : 'No wallet account was returned.');
    if (accounts[0]) void scanWalletTokens(accounts[0]);
  }
  async function connectBrowserWallet() {
    if (!window.ethereum) { setStatus('No browser wallet detected. Use a mobile wallet or WalletConnect.'); return; }
    setBusy(true); try { await finishConnection(window.ethereum); } catch (e) { setStatus(e instanceof Error ? e.message : 'Connection cancelled.'); } finally { setBusy(false); }
  }
  async function connectMobileWallet() {
    const projectId = (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
    if (!projectId) { setStatus('WalletConnect is not configured. Add VITE_WALLETCONNECT_PROJECT_ID to the deployment environment.'); return; }
    setBusy(true); setStatus('Opening WalletConnect…');
    try {
      if (!walletConnectProvider) {
        walletConnectProvider = await EthereumProvider.init({
          projectId,
          optionalChains: chains.map(c => c.id) as [number, ...number[]],
          showQrModal: true,
          qrModalOptions: { enableMobileFullScreen: true },
          metadata: {
            name: 'EVM Recovery',
            description: 'Non-custodial wallet recovery interface',
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.svg`]
          }
        });
        walletConnectProvider.on('accountsChanged', (a: string[]) => { const next = a[0] ?? ''; setAddress(next); if (next) { setRecoveryStep(2); void scanWalletTokens(next); } else { setTokens([]); setRecoveryStep(1); } });
        walletConnectProvider.on('chainChanged', (c: string | number) => { const id = Number(c); setConnectedChain(id); setSelectedChain(id); if (address) void scanWalletTokens(address); });
        walletConnectProvider.on('disconnect', () => { setAddress(''); setConnectedChain(null); setSelectedChain(null); setTokens([]); setScanErrors([]); setRecoveryStep(1); setStatus('Wallet disconnected.'); });
      }
      const accounts = await walletConnectProvider.enable();
      await finishConnection(walletConnectProvider, accounts?.[0]);
    } catch (e) { setStatus(e instanceof Error ? e.message : 'WalletConnect cancelled.'); } finally { setBusy(false); }
  }
  function openWalletApp(app: WalletApp) {
    if (!mobile) { setStatus('Mobile wallet handoff is available on phones and tablets. Use Browser Wallet or WalletConnect on desktop.'); return; }
    if (timer.current !== null) window.clearTimeout(timer.current); setHandoffApp(app); setHandoffPending(true); setStatus(`Opening ${walletName(app)}…`);
    const started = Date.now(); window.location.assign(walletLink(app));
    timer.current = window.setTimeout(() => { if (!document.hidden && Date.now() - started > 1200) { setHandoffPending(false); setStatus(`${walletName(app)} did not take over this page. Use WalletConnect as the fallback.`); } }, 1800);
  }

  async function switchChain(chainId: number) {
    if (!address) return void setStatus('Connect a wallet first.');
    if (chainId === connectedChain) { setSelectedChain(chainId); void scanWalletTokens(address, chainId); return; }
    setBusy(true); setStatus(`Requesting ${chains.find(c => c.id === chainId)?.name ?? 'network'} in your wallet…`);
    try {
      const eip1193 = walletConnectProvider ?? window.ethereum;
      if (!eip1193) throw new Error('No connected wallet provider is available.');
      await eip1193.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${chainId.toString(16)}` }] });
      const provider = new BrowserProvider(eip1193); const network = await provider.getNetwork(); const actual = Number(network.chainId);
      setConnectedChain(actual); setSelectedChain(actual);
      if (actual !== chainId) throw new Error('Wallet did not switch to the selected network.');
      setPreview(false); setTxHash(''); setStatus(`Switched to ${chains.find(c => c.id === actual)?.name ?? 'the selected network'}. Scanning assets…`);
      void scanWalletTokens(address, actual);
    } catch (e: any) {
      setStatus(e?.code === 4902 ? 'This wallet does not have that network configured. Add the network in the wallet, then try again.' : (e instanceof Error ? e.message : 'Network switch was cancelled.'));
    } finally { setBusy(false); }
  }

  function makePreview() {
    if (!address) return void setStatus('Connect a wallet first.'); if (!isAddress(destination)) return void setStatus('Enter a valid EVM destination address.');
    if (destination.toLowerCase() === address.toLowerCase()) return void setStatus('Destination must differ from the connected wallet.');
    if (!chainInfo || connectedChain !== chainInfo.id) return void setStatus('Switch your wallet to the selected network first.');
    try { if (parseEther(amount || '0') <= 0n) throw new Error(); } catch { return void setStatus('Enter a valid native-coin amount.'); }
    setPreview(true); setRecoveryStep(3); setTxHash(''); setStatus('Transaction ready for review. Nothing has been signed.');
  }
  async function sendNativeTransaction() {
    if (!address || !isAddress(destination)) return void setStatus('Connect a wallet and enter a valid destination first.');
    let value; try { value = parseEther(amount); if (value <= 0n) throw new Error(); } catch { return void setStatus('Enter a valid native-coin amount.'); }
    if (!chainInfo || connectedChain !== chainInfo.id) return void setStatus('Switch your wallet to the selected network before signing.');
    setBusy(true); setTxHash(''); setStatus('Waiting for your wallet to show the exact transaction…');
    try {
      const eip1193 = walletConnectProvider ?? window.ethereum; if (!eip1193) throw new Error('No connected wallet provider is available.');
      const provider = new BrowserProvider(eip1193); const network = await provider.getNetwork(); if (Number(network.chainId) !== chainInfo.id) throw new Error('Wallet network changed. Please review again.');
      const signer = await provider.getSigner(); const sender = await signer.getAddress();
      if (sender.toLowerCase() !== address.toLowerCase()) throw new Error('Connected account changed. Reconnect the wallet.');
      const tx = await signer.sendTransaction({ to: destination, value }); setTxHash(tx.hash); setStatus('Transaction submitted. Waiting for confirmation…'); await tx.wait(); setStatus('Transaction confirmed successfully.');
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Transaction was cancelled or failed.'); } finally { setBusy(false); }
  }

  const stepLabels = ['Connect', 'Review details', 'Confirm'];

  return <main className="app-shell">
    <header className="topbar"><div className="brand-lockup"><div className="brand-mark">E</div><div><div className="brand">EVM Recovery</div></div></div><div className="wallet-actions"><button className="ghost-button" onClick={connectBrowserWallet} disabled={busy}>{address ? `${address.slice(0,6)}…${address.slice(-4)}` : 'Connect wallet'}</button><button className="solid-button" onClick={connectMobileWallet} disabled={busy}>WalletConnect</button></div></header>

    <div className="workspace" style={{paddingBottom: 0}}>
      <div className="section-heading" style={{marginBottom: 0}}><div style={{width:'100%'}}><div style={{display:'flex',justifyContent:'flex-end',gap:'12px',alignItems:'center'}}><small style={{opacity:.65}}>Step {recoveryStep} of 3</small></div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginTop:'14px'}}>{stepLabels.map((label,index)=><div key={label}><div style={{height:'4px',borderRadius:'999px',background:index < recoveryStep ? 'currentColor':'rgba(127,127,127,.2)'}}/><small style={{display:'block',marginTop:'7px',opacity:index + 1 === recoveryStep ? 1:.55,fontWeight:index + 1 === recoveryStep ? 700:500}}>{label}</small></div>)}</div></div></div>
    </div>

    {recoveryStep === 1 && <>
      <section className="hero-section"><div className="hero-copy"><div className="status-pill"><span className="live-dot"/> STEP 1 OF 3</div><h1>Connect your<br/><em>wallet.</em></h1><p>Start with your own wallet. Connect once, then review your supported-network portfolio without changing networks.</p></div><div className="hero-card"><div className="hero-card-top"><span>SELF-CUSTODY</span><span>●</span></div><div className="security-icon">✓</div><strong>Your keys stay with you</strong><p>No seed phrases. No private keys. Connect directly to your wallet.</p></div></section>
      <section className="workspace"><div className="section-heading"><span>01</span><div><h2>Connect wallet</h2></div></div><div className="wallet-grid">{(['metamask','trust','coinbase'] as WalletApp[]).map(app => <button className="wallet-card" key={app} onClick={() => openWalletApp(app)} disabled={busy || handoffPending || !mobile}><span className={`wallet-logo ${app}`}>{app === 'metamask' ? 'M' : app === 'trust' ? 'T' : 'C'}</span><span><b>{walletName(app)}</b><small>{mobile ? 'Open mobile app' : 'Mobile only'}</small></span><span className="arrow">↗</span></button>)}<button className="wallet-card" onClick={connectMobileWallet} disabled={busy}><span className="wallet-logo walletconnect">W</span><span><b>WalletConnect</b><small>Connect another wallet</small></span><span className="arrow">→</span></button></div>{handoffPending && <div className="handoff-panel"><div><strong>Waiting for {handoffApp && walletName(handoffApp)}</strong><p>Finish the connection in the wallet app, then return here. If it didn't open, use the fallback.</p></div><div className="handoff-actions"><button onClick={() => handoffApp && openWalletApp(handoffApp)} disabled={busy}>Try again</button><button className="solid-button" onClick={connectMobileWallet} disabled={busy}>WalletConnect</button></div></div>}<div className="status-line"><span className="status-dot"/>{status}</div></section>
      <section className="workspace two-column"><div className="info-card"><div className="card-kicker">PRIVATE BY DESIGN</div><strong>Wallet-controlled</strong><p>Your wallet remains the only place where transaction authorization happens.</p></div><div className="info-card"><div className="card-kicker">NEXT</div><strong>Connect to continue</strong><p>After connection, you'll move to the destination and network review.</p></div></section>
    </>}

    {recoveryStep === 2 && <>
      <section className="hero-section"><div className="hero-copy"><div className="status-pill"><span className="live-dot"/> STEP 2 OF 3</div><h1>Review your<br/><em>destination.</em></h1><p>Connect once, review your portfolio across supported networks, then verify the destination and transaction network before continuing.</p></div><div className="hero-card"><div className="hero-card-top"><span>CONNECTED</span><span>●</span></div><div className="security-icon">✓</div><strong>{chainInfo?.name ?? 'Network detected'}</strong><p>{address ? `${address.slice(0,10)}…${address.slice(-8)}` : 'Wallet not connected'}</p></div></section>
      <section className="workspace"><div className="section-heading"><span>02</span><div><h2>Destination & network</h2></div></div><div className="form-card"><label>Destination wallet</label><input value={destination} onChange={e=>{setDestination(e.target.value);setPreview(false);setTxHash('')}} placeholder="0x…" spellCheck={false} autoComplete="off"/><label>Selected network</label><select value={activeChainId ?? ''} onChange={e => switchChain(Number(e.target.value))} disabled={!address || busy}><option value="" disabled>{address ? 'Select a network' : 'Connect wallet first'}</option>{chains.map(c => <option key={c.id} value={c.id}>{c.name} · {c.native}</option>)}</select><div className="network-list">{chains.map(c => <button key={c.id} onClick={() => switchChain(c.id)} disabled={!address || busy} className={activeChainId === c.id ? 'active' : ''}>{c.name}</button>)}</div></div></section>
      <section className="workspace"><AllAssetsReview assets={tokens} scanning={scanning} onRescan={() => void scanWalletTokens(address)} /></section>
      <section className="workspace two-column">
        <div className="info-card"><div className="card-kicker">PORTFOLIO OVERVIEW</div><strong>{scanSummary.assets} non-zero assets detected</strong><p>{scanSummary.successful} of {scanSummary.scanned} supported networks responded to the read-only scan.</p></div>
        <div className="info-card"><div className="card-kicker">RECOVERY DIAGNOSIS</div><strong>{scanErrors.length === 0 ? 'No scan issues reported' : `${scanErrors.length} issue${scanErrors.length === 1 ? '' : 's'} need attention`}</strong><p>Balances are discovered without switching your wallet network. Any transaction still requires an explicit review and wallet confirmation.</p></div>
      </section>
      {scanErrors.length > 0 && <section className="workspace"><div className="info-card"><div className="card-kicker">DIAGNOSTICS</div><div className="network-list">{scanErrors.map(error => <span key={error}>{error}</span>)}</div></div></section>}
      <section className="workspace"><div className="section-heading"><span>02B</span><div><h2>Amount to review</h2></div></div><div className="form-card"><label>Amount <span>({chainInfo?.native ?? 'native asset'})</span></label><input value={amount} onChange={e=>{setAmount(e.target.value);setPreview(false);setTxHash('')}} placeholder="0.00" inputMode="decimal"/><button className="wide-button" onClick={makePreview} disabled={busy || !address}>Review transaction <span>→</span></button><div className="status-line"><span className="status-dot"/>{status}</div></div></section>
      <section className="workspace two-column"><div className="info-card"><div className="card-kicker">CONNECTED WALLET</div><div className="big-address">{address || 'Not connected'}</div><div className="chain-line">{chainInfo ? <><span className="chain-dot"/> {chainInfo.name} · {chainInfo.id}</> : 'Network not detected'}</div></div><div className="info-card"><div className="card-kicker">SUPPORTED NETWORKS</div><div className="network-list">{chains.map(c=><span key={c.id}>{c.name}</span>)}</div></div></section>
    </>}

    {recoveryStep === 3 && <>
      <section className="hero-section"><div className="hero-copy"><div className="status-pill"><span className="live-dot"/> STEP 3 OF 3</div><h1>Final<br/><em>confirmation.</em></h1><p>Check the details below, then confirm the same transaction inside your connected wallet.</p></div><div className="hero-card"><div className="hero-card-top"><span>READY TO SIGN</span><span>●</span></div><div className="security-icon">✓</div><strong>Nothing signed yet</strong><p>Your wallet will display the transaction for your approval.</p></div></section>
      <section className="review-card"><div className="section-heading"><span>03</span><div><h2>Confirm transaction</h2></div></div><div className="review-grid"><div><small>FROM</small><p>{address}</p></div><div><small>TO</small><p>{destination}</p></div><div><small>AMOUNT</small><p className="amount-value">{amount} {chainInfo?.native ?? 'native asset'}</p></div><div><small>NETWORK</small><p>{chainInfo?.name ?? 'Detected by wallet'}</p></div></div><div className="review-notice"><span>✓</span><div><b>Verify on your wallet</b><p>Compare the destination, amount and network on the wallet's own confirmation screen before approving.</p></div></div><button className="confirm-button" onClick={sendNativeTransaction} disabled={busy}>{busy ? 'Waiting for wallet…' : 'Confirm in wallet'} <span>→</span></button>{txHash&&<p className="tx-result"><b>Transaction submitted:</b> {chainInfo?<a href={chainInfo.explorer+txHash} target="_blank" rel="noreferrer">View on explorer ↗</a>:txHash}</p>}</section>
    </>}

    <footer><div><b>Security first.</b> This interface never asks for a seed phrase or private key.</div><span>© EVM Recovery · Non-custodial</span></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);