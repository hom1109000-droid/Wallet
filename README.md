# EVM Wallet Recovery

A non-custodial recovery interface for reviewing an EVM wallet and destination address before authorization.

## Included
- EVM wallet connection through the browser wallet provider
- Destination-address validation
- Ethereum, BNB Smart Chain and Polygon network display
- Recovery preview with no automatic transfers
- No seed phrase or private-key collection

## Run locally

```bash
npm install
npm run dev
```

## Safety
This repository deliberately does not contain an unrestricted wallet sweeper or code that can automatically move arbitrary assets. Any production recovery executor should use an audited, narrowly scoped authorization design, explicit user confirmation, chain-specific support checks, transaction simulation, and clear destination verification.
