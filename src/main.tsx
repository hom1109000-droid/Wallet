import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserProvider, isAddress, parseEther } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import './styles.css';

declare global { interface Window { ethereum?: any } }

const chains = [
  { id: 1, name: 'Ethereum', native: 'ETH', explorer: 'https://etherscan.io/tx/' }, { id: 10, name: 'OP Mainnet', native: 'ETH', explorer: 'https://optimistic.etherscan.io/tx/' },
  { id: 56, name: 'BNB Smart Chain', native: 'BNB', explorer: 'https://bscscan.com/tx/' }, { id: 100, name: 'Gnosis', native: 'xDAI', explorer: 'https://gnosisscan.io/tx/' },
  { id: 137, name: 'Polygon', native: 'POL', explorer: 'https://polygonscan.com/tx/' }, { id: 143, name: 'Monad', native: 'MON', explorer: 'https://monadscan.com/tx/' },
  { id: 130, name: 'Unichain', native: 'ETH', explorer: 'https://uniscan.xyz/tx/' }, { id: 1868, name: 'Soneium', native: 'ETH', explorer: 'https://soneium.blockscout.com/tx/' },
  { id: 42161, name: 'Arbitrum One', native: 'ETH', explorer: 'https://arbiscan.io/tx/' }, { id: 43114, name: 'Avalanche C-Chain', native: 'AVAX', explorer: 'https://snowtrace.io/tx/' },
  { id: 8453, name: 'Base', native: 'ETH', explorer: 'https://basescan.org/tx/' }, { id: 999, name: 'HyperEVM', native: 'HYPE', explorer: 'https://hyperevmscan.io/tx/' },
];
type WalletApp = 'metamask' | 'trust' | 'coinbase';
let walletConnectProvider: any = null;

const walletName = (app: WalletApp) => app === 'metamask' ? 'MetaMask' : app === 'trust' ? 'Trust Wallet' : 'Coinbase Wallet';
const isMobileBrowser = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
function walletLink(app: WalletApp) {
  const url = encodeURIComponent(window.location.href);
  const path = `${window.location.host}${window.location.pathname}${window.location.search}`;
  return { metamask: `https://metamask.app.link/dapp/${path}`, trust: `https://link.trustwallet.com/open_url?url=${url}`, coinbase: `https://go.cb-w.com/dapp?cb_url=${url}` }[app];
}

function App() {
  const [address, setAddress] = useState(''); const [destination, setDestination] = useState(''); const [amount, setAmount] = useState('');
  const [connectedChain, setConnectedChain] = useState<number | null>(null); const [status, setStatus] = useState('Connect your wallet to begin.');
  const [preview, setPreview] = useState(false); const [txHash, setTxHash] = useState(''); const [busy, setBusy] = useState(false);
  const [handoffApp, setHandoffApp] = useState<WalletApp | null>(null); const [handoffPending, setHandoffPending] = useState(false); const timer = useRef<number | null>(null);
  const mobile = isMobileBrowser(); const chainInfo = useMemo(() => chains.find(c => c.id === connectedChain), [connectedChain]);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  async function finishConnection(eip1193: any) {
    const provider = new BrowserProvider(eip1193); const accounts = await provider.send('eth_requestAccounts', []); const network = await provider.getNetwork();
    setAddress(accounts[0] ?? ''); setConnectedChain(Number(network.chainId)); setStatus(accounts[0] ? 'Wallet connected and ready.' : 'No wallet account was returned.');
  }
  async function connectBrowserWallet() {
    if (!window.ethereum) { setStatus('No browser wallet detected. Use a mobile wallet or WalletConnect.'); return; }
    setBusy(true); try { await finishConnection(window.ethereum); } catch (e) { setStatus(e instanceof Error ? e.message : 'Connection cancelled.'); } finally { setBusy(false); }
  }
  async function connectMobileWallet() {
    const projectId = (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
    if (!projectId) { setStatus('WalletConnect is not configured. Add VITE_WALLETCONNECT_PROJECT_ID to the deployment environment.'); return; }
    setBusy(true); setStatus('Preparing WalletConnect…');
    try {
      if (!walletConnectProvider) {
        walletConnectProvider = await EthereumProvider.init({ projectId, optionalChains: chains.map(c => c.id) as [number, ...number[]], methods: ['eth_sendTransaction', 'eth_sign', 'personal_sign'], events: ['accountsChanged', 'chainChanged', 'disconnect'], showQrModal: true, metadata: { name: 'EVM Recovery', description: 'Non-custodial wallet recovery interface', url: window.location.origin, icons: [`${window.location.origin}/favicon.svg`] } });
        walletConnectProvider.on('accountsChanged', (a: string[]) => setAddress(a[0] ?? ''));
        walletConnectProvider.on('chainChanged', (c: string | number) => setConnectedChain(Number(c)));
        walletConnectProvider.on('disconnect', () => { setAddress(''); setConnectedChain(null); setStatus('Wallet disconnected.'); });
      }
      await walletConnectProvider.enable(); await finishConnection(walletConnectProvider);
    } catch (e) { setStatus(e instanceof Error ? e.message : 'WalletConnect cancelled.'); } finally { setBusy(false); }
  }
  function openWalletApp(app: WalletApp) {
    if (!mobile) { setStatus('Mobile wallet handoff is available on phones and tablets. Use Browser Wallet or WalletConnect on desktop.'); return; }
    if (timer.current !== null) window.clearTimeout(timer.current); setHandoffApp(app); setHandoffPending(true); setStatus(`Opening ${walletName(app)}…`);
    const started = Date.now(); window.location.assign(walletLink(app));
    timer.current = window.setTimeout(() => { if (!document.hidden && Date.now() - started > 1200) { setHandoffPending(false); setStatus(`${walletName(app)} did not take over this page. Use WalletConnect as the fallback.`); } }, 1800);
  }
  function makePreview() {
    if (!address) return void setStatus('Connect a wallet first.'); if (!isAddress(destination)) return void setStatus('Enter a valid EVM destination address.');
    if (destination.toLowerCase() === address.toLowerCase()) return void setStatus('Destination must differ from the connected wallet.');
    try { if (parseEther(amount || '0') <= 0n) throw new Error(); } catch { return void setStatus('Enter a valid native-coin amount.'); }
    setPreview(true); setTxHash(''); setStatus('Transaction ready for review. Nothing has been signed.');
  }
  async function sendNativeTransaction() {
    if (!address || !isAddress(destination)) return void setStatus('Connect a wallet and enter a valid destination first.');
    let value; try { value = parseEther(amount); if (value <= 0n) throw new Error(); } catch { return void setStatus('Enter a valid native-coin amount.'); }
    setBusy(true); setTxHash(''); setStatus('Waiting for your wallet to show the exact transaction…');
    try {
      const eip1193 = walletConnectProvider ?? window.ethereum; if (!eip1193) throw new Error('No connected wallet provider is available.');
      const provider = new BrowserProvider(eip1193); const signer = await provider.getSigner(); const sender = await signer.getAddress();
      if (sender.toLowerCase() !== address.toLowerCase()) throw new Error('Connected account changed. Reconnect the wallet.');
      const tx = await signer.sendTransaction({ to: destination, value }); setTxHash(tx.hash); setStatus('Transaction submitted. Waiting for confirmation…'); await tx.wait(); setStatus('Transaction confirmed successfully.');
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Transaction was cancelled or failed.'); } finally { setBusy(false); }
  }

  return <main className="app-shell">
    <header className="topbar"><div className="brand-lockup"><div className="brand-mark">E</div><div><div className="brand">EVM Recovery</div><div className="brand-sub">Self-custody tools</div></div></div><div className="wallet-actions"><button className="ghost-button" onClick={connectBrowserWallet} disabled={busy}>{address ? `${address.slice(0,6)}…${address.slice(-4)}` : 'Connect wallet'}</button><button className="solid-button" onClick={connectMobileWallet} disabled={busy}>WalletConnect</button></div></header>
    <section className="hero-section"><div className="hero-copy"><div className="status-pill"><span className="live-dot"/> Non-custodial</div><h1>Recovery, with<br/><em>control.</em></h1><p>Connect your wallet, review exactly what will happen, and authorize each transaction yourself. Your keys never leave your wallet.</p></div><div className="hero-card"><div className="hero-card-top"><span>SECURITY</span><span>●</span></div><div className="security-icon">✓</div><strong>Wallet-controlled signing</strong><p>No seed phrases. No private keys. No hidden approvals.</p></div></section>
    <section className="workspace"><div className="section-heading"><span>01</span><div><h2>Connect</h2><p>Choose how you want to connect your wallet.</p></div></div><div className="wallet-grid">
      {(['metamask','trust','coinbase'] as WalletApp[]).map(app => <button className="wallet-card" key={app} onClick={() => openWalletApp(app)} disabled={busy || handoffPending || !mobile}><span className={`wallet-logo ${app}`}>{app === 'metamask' ? 'M' : app === 'trust' ? 'T' : 'C'}</span><span><b>{walletName(app)}</b><small>{mobile ? 'Open mobile app' : 'Mobile only'}</small></span><span className="arrow">↗</span></button>)}
      <button className="wallet-card" onClick={connectMobileWallet} disabled={busy}><span className="wallet-logo walletconnect">W</span><span><b>WalletConnect</b><small>Connect another wallet</small></span><span className="arrow">→</span></button></div>
      {handoffPending && <div className="handoff-panel"><div><strong>Waiting for {handoffApp && walletName(handoffApp)}</strong><p>Finish the connection in the wallet app, then return here. If it didn't open, use the fallback.</p></div><div className="handoff-actions"><button onClick={() => handoffApp && openWalletApp(handoffApp)} disabled={busy}>Try again</button><button className="solid-button" onClick={connectMobileWallet} disabled={busy}>WalletConnect</button></div></div>}
    </section>
    <section className="workspace"><div className="section-heading"><span>02</span><div><h2>Build a transaction</h2><p>Enter one destination and one native-asset amount. Review before signing.</p></div></div><div className="form-card"><label>Destination address</label><input value={destination} onChange={e=>{setDestination(e.target.value);setPreview(false);setTxHash('')}} placeholder="0x…" spellCheck={false} autoComplete="off"/><label>Amount <span>({chainInfo?.native ?? 'native asset'})</span></label><input value={amount} onChange={e=>{setAmount(e.target.value);setPreview(false);setTxHash('')}} placeholder="0.00" inputMode="decimal"/><button className="wide-button" onClick={makePreview} disabled={busy}>Review transaction <span>→</span></button><div className="status-line"><span className="status-dot"/>{status}</div></div></section>
    <section className="workspace two-column"><div className="info-card"><div className="card-kicker">CONNECTED WALLET</div><div className="big-address">{address || 'Not connected'}</div><div className="chain-line">{chainInfo ? <><span className="chain-dot"/> {chainInfo.name} · {connectedChain}</> : 'Network not detected'}</div></div><div className="info-card"><div className="card-kicker">SUPPORTED NETWORKS</div><div className="network-list">{chains.slice(0,6).map(c=><span key={c.id}>{c.name}</span>)}<span>+{chains.length-6} more</span></div></div></section>
    {preview && <section className="review-card"><div className="section-heading"><span>03</span><div><h2>Final review</h2><p>Nothing is signed until you confirm in your wallet.</p></div></div><div className="review-grid"><div><small>FROM</small><p>{address}</p></div><div><small>TO</small><p>{destination}</p></div><div><small>AMOUNT</small><p className="amount-value">{amount} {chainInfo?.native ?? 'native asset'}</p></div><div><small>NETWORK</small><p>{chainInfo?.name ?? 'Detected by wallet'}</p></div></div><div className="review-notice"><span>✓</span><div><b>Verify on your wallet</b><p>Compare the destination, amount and network on the wallet's own confirmation screen before approving.</p></div></div><button className="confirm-button" onClick={sendNativeTransaction} disabled={busy}>{busy ? 'Waiting for wallet…' : 'Confirm in wallet'} <span>→</span></button>{txHash&&<p className="tx-result"><b>Transaction submitted:</b> {chainInfo?<a href={chainInfo.explorer+txHash} target="_blank" rel="noreferrer">View on explorer ↗</a>:txHash}</p>}</section>}
    <footer><div><b>Security first.</b> This interface never asks for a seed phrase or private key.</div><span>© EVM Recovery · Non-custodial</span></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
