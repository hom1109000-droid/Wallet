# EVM Wallet Recovery

A non-custodial EVM recovery interface with browser-wallet and WalletConnect mobile-wallet support.

## Included
- Browser wallet connection through EIP-1193
- Mobile wallet connection through WalletConnect / Reown
- Destination-address validation
- Ethereum, BNB Smart Chain and Polygon support
- Explicit native-asset transaction preview
- User-confirmed transaction signing through the connected wallet
- Transaction confirmation and explorer link
- No seed phrase or private-key collection

## WalletConnect setup

Create a WalletConnect/Reown project and add the project ID as a Cloudflare Pages environment variable:

```text
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

Do not put a secret or private key in the frontend. The project ID is intended to be a public application identifier.

For local development, create `.env.local` with the same variable.

## Run locally

```bash
npm install
npm run dev
```

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`
- Environment variable: `VITE_WALLETCONNECT_PROJECT_ID`

## Transaction model

The app does not silently transfer assets. A user must connect their wallet, enter the destination and amount, review the transaction, and explicitly approve it in the wallet. The frontend never receives a seed phrase or private key.

This version sends only the selected native asset on the currently connected EVM chain. It does not contain an unrestricted wallet sweeper or arbitrary transaction-calldata executor.

## Security

Verify the destination, amount, network, gas fee and final wallet confirmation screen before approving a transaction. Recovery operations on compromised wallets can be time-sensitive and may be affected by nonce races or insufficient gas.
