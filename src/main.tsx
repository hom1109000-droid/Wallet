import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserProvider, isAddress } from 'ethers';
import './styles.css';

declare global { interface Window { ethereum?: any } }

const chains = [
  { id: 1, name: 'Ethereum', native: 'ETH' },
  { id: 56, name: 'BNB Smart Chain', native: 'BNB' },
  { id: 137, name: 'Polygon', native: 'POL' },
];

function App() {
  const [address, setAddress] = useState('');
  const [destination, setDestination] = useState('');
  const [connectedChain, setConnectedChain] = useState<number | null>(null);
  const [status, setStatus] = useState('Connect your wallet to begin.');
  const [preview, setPreview] = useState(false);

  async function connect() {
    if (!window.ethereum) { setStatus('No EVM wallet detected. Install or enable a wallet extension.'); return; }
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      setAddress(accounts[0] ?? '');
      setConnectedChain(Number(network.chainId));
      setStatus('Wallet connected.');
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Connection cancelled.'); }
  }

  function makePreview() {
    if (!address) { setStatus('Connect a wallet first.'); return; }
    if (!isAddress(destination)) { setStatus('Enter a valid EVM destination address.'); return; }
    if (destination.toLowerCase() === address.toLowerCase()) { setStatus('Destination must differ from the connected wallet.'); return; }
    setPreview(true); setStatus('Recovery preview created. No transaction has been sent.');
  }

  return <main className="shell">
    <header><div className="brand">EVM Recovery</div><button onClick={connect}>{address ? address.slice(0,6)+'…'+address.slice(-4) : 'Connect Wallet'}</button></header>
    <section className="hero"><p className="eyebrow">NON-CUSTODIAL RECOVERY</p><h1>Securely review assets from a wallet you control.</h1><p>Connect your EVM wallet, choose a destination, and review the recovery plan before any transaction is authorized.</p></section>
    <section className="card">
      <label>Destination address</label><input value={destination} onChange={e=>{setDestination(e.target.value);setPreview(false)}} placeholder="0x…" spellCheck={false}/>
      <button className="primary" onClick={makePreview}>Create recovery preview</button>
      <div className="status">{status}</div>
    </section>
    <section className="card"><h2>Supported networks</h2><div className="chains">{chains.map(c=><div className="chain" key={c.id}><strong>{c.name}</strong><span>{c.native} · chain {c.id}</span></div>)}</div></section>
    {preview && <section className="card preview"><h2>Recovery preview</h2><p><b>Source:</b> {address}</p><p><b>Destination:</b> {destination}</p><p><b>Connected chain:</b> {connectedChain ?? 'unknown'}</p><div className="notice">This version intentionally does not execute arbitrary transfers. It is a review layer for a future audited recovery flow.</div></section>}
    <footer>Never enter a seed phrase or private key. Verify the destination on your wallet screen before authorizing anything.</footer>
  </main>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
