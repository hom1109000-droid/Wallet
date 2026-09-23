import { ContractFactory, Contract, MaxUint256, BrowserProvider, getAddress } from 'ethers';
import {
  PERMIT2_ADDRESS,
  SWEEPER_ABI,
  SWEEPER_BYTECODE,
} from './sweeperBytecode';

export { PERMIT2_ADDRESS, SWEEPER_ABI, SWEEPER_BYTECODE };

const ERC20_APPROVE_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
] as const;

const storageKey = (chainId: number, recovery: string) =>
  `sweeper:${chainId}:${recovery.toLowerCase()}`;

export function loadSweeperAddress(chainId: number, recovery: string): string | null {
  try {
    return localStorage.getItem(storageKey(chainId, recovery));
  } catch {
    return null;
  }
}

export function saveSweeperAddress(chainId: number, recovery: string, addr: string) {
  try {
    localStorage.setItem(storageKey(chainId, recovery), addr);
  } catch {}
}

export async function deploySweeper(
  signer: any,
  recovery: string,
  onStatus?: (s: string) => void,
): Promise<string> {
  onStatus?.('Deploy RecoverySweeper — confirm in wallet…');
  const factory = new ContractFactory(SWEEPER_ABI, SWEEPER_BYTECODE, signer);
  const contract = await factory.deploy(recovery);
  onStatus?.('Waiting for deploy confirmation…');
  await contract.waitForDeployment();
  return await contract.getAddress();
}

async function ensurePermit2Allowances(
  signer: any,
  tokenAddresses: string[],
  onStatus?: (s: string) => void,
): Promise<void> {
  const sender = await signer.getAddress();
  for (const tokenAddr of tokenAddresses) {
    try {
      const token = new Contract(tokenAddr, ERC20_APPROVE_ABI, signer);
      const bal: bigint = await token.balanceOf(sender);
      if (bal <= 0n) continue;
      const current: bigint = await token.allowance(sender, PERMIT2_ADDRESS);
      if (current >= bal) continue;
      onStatus?.(`Approve ${tokenAddr.slice(0, 8)}… to Permit2 (one-time)`);
      const tx = await token.approve(PERMIT2_ADDRESS, MaxUint256);
      await tx.wait();
    } catch (e: any) {
      if (e?.code === 4001) throw e;
      onStatus?.(`Permit2 approve skipped: ${e?.message || 'error'}`);
    }
  }
}

const PERMIT2_TYPES = {
  PermitBatchTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions[]' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
};

export async function approveAndSweep(
  signer: any,
  provider: BrowserProvider,
  sweeperAddr: string,
  tokenAddresses: string[],
  sendNative: boolean,
  onStatus?: (s: string) => void,
): Promise<string | null> {
  const sender = await signer.getAddress();
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  let lastHash: string | null = null;

  await ensurePermit2Allowances(signer, tokenAddresses, onStatus);

  const sweeper = new Contract(sweeperAddr, SWEEPER_ABI, signer);
  let nativeValue = 0n;
  if (sendNative) {
    const bal = await provider.getBalance(sender);
    const feeData = await provider.getFeeData();
    const maxFee = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
    const gasReserve = 350000n * maxFee * 12n / 10n;
    if (bal > gasReserve) nativeValue = bal - gasReserve;
  }

  const permitted: { token: string; amount: bigint }[] = [];
  const details: { to: string; requestedAmount: bigint }[] = [];
  const recovery: string = await sweeper.recovery();

  for (const tokenAddr of tokenAddresses) {
    try {
      const token = new Contract(tokenAddr, ERC20_APPROVE_ABI, provider);
      const bal: bigint = await token.balanceOf(sender);
      if (bal <= 0n) continue;
      permitted.push({ token: getAddress(tokenAddr), amount: bal });
      details.push({ to: getAddress(recovery), requestedAmount: bal });
    } catch {}
  }

  if (permitted.length === 0) {
    onStatus?.('Sweep native — confirm in wallet…');
    const tx = await sweeper.sweepTokensAndNative([], { value: nativeValue });
    lastHash = tx.hash;
    await tx.wait();
    return lastHash;
  }

  onStatus?.('Sign once for all tokens (Permit2)…');
  const nonceWord = BigInt(Math.floor(Math.random() * 1_000_000_000));
  const nonceVal = (nonceWord << 8n) | 0n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  const domain = {
    name: 'Permit2',
    chainId,
    verifyingContract: PERMIT2_ADDRESS,
  };

  const message = {
    permitted: permitted.map(p => ({ token: p.token, amount: p.amount })),
    spender: getAddress(sweeperAddr),
    nonce: nonceVal,
    deadline,
  };

  let signature: string;
  try {
    signature = await signer.signTypedData(domain, PERMIT2_TYPES, message);
  } catch (e: any) {
    onStatus?.('Permit2 sign cancelled — classic fallback…');
    return classicApproveAndSweep(signer, provider, sweeperAddr, tokenAddresses, sendNative, onStatus);
  }

  onStatus?.('One sweep tx (all tokens + native) — confirm in wallet…');
  const permitStruct = {
    permitted: permitted.map(p => ({ token: p.token, amount: p.amount })),
    nonce: nonceVal,
    deadline,
  };

  try {
    const tx = await sweeper.sweepWithPermit2(permitStruct, details, signature, { value: nativeValue });
    lastHash = tx.hash;
    await tx.wait();
    return lastHash;
  } catch (e: any) {
    if (e?.code === 4001) throw e;
    onStatus?.('Permit2 sweep failed — classic fallback…');
    return classicApproveAndSweep(signer, provider, sweeperAddr, tokenAddresses, sendNative, onStatus);
  }
}

async function classicApproveAndSweep(
  signer: any,
  provider: BrowserProvider,
  sweeperAddr: string,
  tokenAddresses: string[],
  sendNative: boolean,
  onStatus?: (s: string) => void,
): Promise<string | null> {
  const sender = await signer.getAddress();
  let lastHash: string | null = null;

  for (const tokenAddr of tokenAddresses) {
    try {
      const token = new Contract(tokenAddr, ERC20_APPROVE_ABI, signer);
      const bal: bigint = await token.balanceOf(sender);
      if (bal <= 0n) continue;
      const current: bigint = await token.allowance(sender, sweeperAddr);
      if (current >= bal) continue;
      onStatus?.(`Approve token ${tokenAddr.slice(0, 8)}… in wallet`);
      const tx = await token.approve(sweeperAddr, MaxUint256);
      lastHash = tx.hash;
      await tx.wait();
    } catch (e: any) {
      if (e?.code === 4001) throw e;
    }
  }

  const sweeper = new Contract(sweeperAddr, SWEEPER_ABI, signer);
  let nativeValue = 0n;
  if (sendNative) {
    const bal = await provider.getBalance(sender);
    const feeData = await provider.getFeeData();
    const maxFee = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
    const gasReserve = 250000n * maxFee * 12n / 10n;
    if (bal > gasReserve) nativeValue = bal - gasReserve;
  }

  onStatus?.('Sweep once — confirm in wallet…');
  const tx = await sweeper.sweepTokensAndNative(tokenAddresses, { value: nativeValue });
  lastHash = tx.hash;
  await tx.wait();
  return lastHash;
}
