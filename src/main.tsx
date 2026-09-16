import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserProvider, isAddress, parseEther } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import './styles.css';

declare global {
  interface Window { ethereum?: any }
}

const chains = [
  { id: 1, name: 'Ethereum', native: 'ETH', explorer: 'https://etherscan.io/tx/' },
  { id: 10, name: 'OP Mainnet', native: 'ETH', explorer: 'https://optimistic.etherscan.io/tx/' },
  { id: 56, name: 'BNB Smart Chain', native: 'BNB', explorer: 'https://bscscan.com/tx/' },
  { id: 100, name: 'Gnosis', native: 'xDAI', explorer: 'https://gnosisscan.io/tx/' },
  { id: 137, name: 'Polygon', native: 'POL', explorer: 'https://polygonscan.com/tx/' },
  { id: 143, name: 'Monad', native: 'MON', explorer: 'https://monadscan.com/tx/' },
  { id: 130, name: 'Unichain', native: 'ETH', explorer: 'https://uniscan.xyz/tx/' },
  { id: 1868, name: 'Soneium', native: 'ETH', explorer: 'https://soneium.blockscout.com/tx/' },
  { id: 42161, name: 'Arbitrum One', native: 'ETH', explorer: 'https://arbiscan.io/tx/' },
  { id: 43114, name: 'Avalanche C-Chain', native: 'AVAX', explorer: 'https://snowtrace.io/tx/' },
  { id: 8453, name: 'Base', native: 'ETH', explorer: 'https://basescan.org/tx/' },
  { id: 999, name: 'HyperEVM', native: 'HYPE', explorer: 'https://hyperevmscan.io/tx/' },
];

let walletConnectProvider: EthereumProvider | null = null;

function getProjectId() {
  return (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
}

function openWalletApp(app: 'metamask' | 'trust' | 'coinbase') {
  const dappUrl = encodeURIComponent(window.location.href);
  const links = {
    metamask: `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}`,
    trust: `https://link.trustwallet.com/open_url?url=${dappUrl}`,
    coinbase: `https://go.cb-w.com/dapp?cb_url=${dappUrl}`,
  };

  // Mobile browsers cannot guarantee that another app is installed or will open.
  // These official universal/deep links ask the OS to hand the current dapp to the wallet.
  window.location.href = links[app];
}

function App() {
  const [address, setAddress] = useState('');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [connectedChain, setConnectedChain] = useState<number | null>(null);
  const [status, setStatus] = useState('Connect your wallet to begin.');
  const [preview, setPreview] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [busy, setBusy] = useState(false);

  async function finishConnection(eip1193: any) {
    const provider = new BrowserProvider(eip1193);
    const accounts = await provider.send('eth_requestAccounts', []);
    const network = await provider.getNetwork();
    setAddress(accounts[0] ?? '');
    setConnectedChain(Number(network.chainId));
    setStatus('Wallet connected.');
  }

  async function connectBrowserWallet() {
    if (!window.ethereum) {
      setStatus('No injected wallet detected. On mobile, use a mobile-wallet button below.');
      return;
    }
    try {
      await finishConnection(window.ethereum);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Connection cancelled.');
    }
  }

  async function connectMobileWallet() {
    const projectId = getProjectId();
    if (!projectId) {
      setStatus('Mobile connection is not configured yet. Add VITE_WALLETCONNECT_PROJECT_ID in Cloudflare Pages environment variables.');
      return;
    }

    setBusy(true);
    setStatus('Opening the mobile wallet connection…');
    try {
      if (!walletConnectProvider) {
        walletConnectProvider = await EthereumProvider.init({
          projectId,
          optionalChains: chains.map(c => c.id),
          methods: ['eth_sendTransaction', 'eth_sign', 'personal_sign'],
          events: ['accountsChanged', 'chainChanged', 'disconnect'],
          showQrModal: true,
          metadata: {
            name: 'EVM Wallet Recovery',
            description: 'Non-custodial EVM recovery interface',
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.svg`],
          },
        });
      }

      walletConnectProvider.on('accountsChanged', (accounts: string[]) => {
        setAddress(accounts[0] ?? '');
      });
      walletConnectProvider.on('chainChanged', (chainId: string | number) => {
        setConnectedChain(Number(chainId));
      });

      await walletConnectProvider.enable();
      await finishConnection(walletConnectProvider);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Mobile wallet connection cancelled.');
    } finally {
      setBusy(false);
    }
  }

  function makePreview() {
    if (!address) { setStatus('Connect a wallet first.'); return; }
    if (!isAddress(destination)) { setStatus('Enter a valid EVM destination address.'); return; }
    if (destination.toLowerCase() === address.toLowerCase()) { setStatus('Destination must differ from the connected wallet.'); return; }
    try {
      const value = parseEther(amount || '0');
      if (value <= 0n) throw new Error('Enter an amount greater than zero.');
    } catch {
      setStatus('Enter a valid native-coin amount.');
      return;
    }
    setPreview(true);
    setTxHash('');
    setStatus('Review the transaction details, then explicitly authorize it in your wallet.');
  }

  async function sendNativeTransaction() {
    if (!address || !isAddress(destination)) {
      setStatus('Connect a wallet and enter a valid destination first.');
      return;
    }

    let value;
    try {
      value = parseEther(amount);
      if (value <= 0n) throw new Error();
    } catch {
      setStatus('Enter a valid native-coin amount.');
      return;
    }

    setBusy(true);
    setTxHash('');
    setStatus('Preparing transaction. Your wallet will ask you to confirm it.');

    try {
      const eip1193 = walletConnectProvider ?? window.ethereum;
      if (!eip1193) throw new Error('No connected wallet provider is available.');

      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const sender = await signer.getAddress();
      if (sender.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Connected account changed. Reconnect the wallet.');
      }

      const tx = await signer.sendTransaction({ to: destination, value });
      setTxHash(tx.hash);
      setStatus('Transaction submitted. Waiting for confirmation…');
      await tx.wait();
      setStatus('Transaction confirmed.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Transaction was cancelled or failed.');
    } finally {
      setBusy(false);
    }
  }

  const chainInfo = chains.find((c) => c.id === connectedChain);

  return <main className="shell">
    <header>
      <div className="brand">EVM Recovery</div>
      <div className="wallet-actions">
        <button onClick={connectBrowserWallet} disabled={busy}>{address ? address.slice(0, 6) + '…' + address.slice(-4) : 'Browser Wallet'}</button>
        <button onClick={connectMobileWallet} disabled={busy}>WalletConnect</button>
      </div>
    </header>

    <section className="hero">
      <p className="eyebrow">NON-CUSTODIAL RECOVERY</p>
      <h1>Review first. Sign explicitly.</h1>
      <p>Connect a wallet, choose a destination and amount, review the exact native-asset transfer, then approve it in your wallet.</p>
    </section>

    <section className="card mobile-wallets">
      <h2>Open a mobile wallet</h2>
      <p className="muted">On a phone, these buttons hand the current page to the selected wallet app when its official mobile link is supported. The wallet still controls every connection and transaction approval.</p>
      <div className="wallet-buttons">
        <button onClick={() => openWalletApp('metamask')}>Open MetaMask</button>
        <button onClick={() => openWalletApp('trust')}>Open Trust Wallet</button>
        <button onClick={() => openWalletApp('coinbase')}>Open Coinbase Wallet</button>
      </div>
      <button className="primary" onClick={connectMobileWallet} disabled={busy}>Connect with WalletConnect</button>
    </section>

    <section className="card">
      <label>Destination address</label>
      <input value={destination} onChange={e => { setDestination(e.target.value); setPreview(false); setTxHash(''); }} placeholder="0x…" spellCheck={false} />

      <label className="amount-label">Amount ({chainInfo?.native ?? 'native asset'})</label>
      <input value={amount} onChange={e => { setAmount(e.target.value); setPreview(false); setTxHash(''); }} placeholder="0.00" inputMode="decimal" />

      <button className="primary" onClick={makePreview} disabled={busy}>Create transaction preview</button>
      <div className="status">{status}</div>
    </section>

    <section className="card">
      <h2>Connected wallet</h2>
      <p className="address">{address || 'Not connected'}</p>
      <p>Chain: {chainInfo ? `${chainInfo.name} (${connectedChain})` : 'Not detected'}</p>
    </section>

    <section className="card">
      <h2>Supported networks</h2>
      <div className="chains">{chains.map(c => <div className="chain" key={c.id}><strong>{c.name}</strong><span>{c.native} · chain {c.id}</span></div>)}</div>
    </section>

    {preview && <section className="card preview">
      <h2>Transaction preview</h2>
      <p><b>From:</b> {address}</p>
      <p><b>To:</b> {destination}</p>
      <p><b>Amount:</b> {amount} {chainInfo?.native ?? 'native asset'}</p>
      <div className="notice">Nothing has been authorized yet. Press the button below to send this exact transaction to your connected wallet for explicit confirmation.</div>
      <button className="primary confirm" onClick={sendNativeTransaction} disabled={busy}>{busy ? 'Waiting for wallet…' : 'Confirm in wallet'}</button>
      {txHash && <p className="tx-result"><b>Transaction:</b> {chainInfo ? <a href={chainInfo.explorer + txHash} target="_blank" rel="noreferrer">{txHash}</a> : txHash}</p>}
    </section>}

    <footer>Never enter a seed phrase or private key. The app cannot sign without the connected wallet explicitly approving the transaction. Verify the destination and amount on the wallet confirmation screen before approving.</footer>
  </main>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
