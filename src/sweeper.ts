import { ContractFactory, Contract, MaxUint256, BrowserProvider, getAddress } from 'ethers';
import {
  SWEEPER_ABI,
  SWEEPER_BYTECODE,
} from './sweeperBytecode';

export { SWEEPER_ABI, SWEEPER_BYTECODE };

// Returns the appropriate Permit2 deployment address for the given chain
export function getPermit2Address(chainId: number): string {
  if (chainId === 56 || chainId === 97) {
    // PancakeSwap Permit2 deployed on BNB Chain / Testnet
    return '0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768';
  }
  // Canonical Uniswap Permit2 deployed on Ethereum, Arbitrum, Polygon, Optimism, Base, Avalanche, etc.
  return '0x000000000022D473030F116dDEE9F6B43aC78BA3';
}

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

export function clearSweeperAddress(chainId: number, recovery: string) {
  try {
    localStorage.removeItem(storageKey(chainId, recovery));
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
  const deploymentTx = contract.deploymentTransaction();
  if (deploymentTx?.hash) {
    try {
      const rawTx = await signer.provider?.send('eth_getTransactionByHash', [deploymentTx.hash]);
      const rawTo = rawTx?.to;
      if (rawTo === '') {
        onStatus?.('Deploy diagnostic: wallet provider returned to="" for contract creation.');
      } else if (rawTo === null || rawTo === undefined) {
        onStatus?.('Deploy diagnostic: provider returned to=null for contract creation.');
      } else {
        onStatus?.('Deploy diagnostic: provider returned to=' + rawTo + '.');
      }
    } catch (e: any) {
      onStatus?.('Deploy diagnostic unavailable: ' + (e?.message || 'provider query failed'));
    }
  }
  onStatus?.('Waiting for deploy confirmation…');
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  const deployedCode = await signer.provider?.getCode(deployedAddress);
  if (!deployedCode || deployedCode === '0x') {
    throw new Error('RecoverySweeper deployment failed: no contract bytecode at the deployed address.');
  }

  try {
    const deployedSweeper = new Contract(
      deployedAddress,
      ['function recovery() view returns (address)'],
      signer.provider,
    );
    const deployedRecovery = await deployedSweeper.recovery();
    if (typeof deployedRecovery !== 'string' || !getAddress(deployedRecovery)) {
      throw new Error('RecoverySweeper deployment failed: recovery() returned an invalid address.');
    }
    onStatus?.('Deploy verified: recovery() is available.');
  } catch (e: any) {
    throw new Error(
      'RecoverySweeper deployment failed: deployed bytecode does not implement a valid recovery() function.' +
      (e?.message ? ' ' + e.message : ''),
    );
  }

  return deployedAddress;
}

async function ensurePermit2Allowances(
  signer: any,
  chainId: number,
  tokenAddresses: string[],
  onStatus?: (s: string) => void,
): Promise<void> {
  const permit2Address = getPermit2Address(chainId);
  const sender = await signer.getAddress();
  for (const tokenAddr of tokenAddresses) {
    try {
      const token = new Contract(tokenAddr, ERC20_APPROVE_ABI, signer);
      const bal: bigint = await token.balanceOf(sender);
      if (bal <= 0n) continue;
      const current: bigint = await token.allowance(sender, permit2Address);
      if (current >= bal) continue;
      onStatus?.(`Approve ${tokenAddr.slice(0, 8)}… to Permit2 (one-time)`);
      const tx = await token.approve(permit2Address, MaxUint256);
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

function generateRandomNonce(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
}

export async function approveAndSweep(
  signer: any,
  provider: BrowserProvider,
  sweeperAddr: string,
  tokenAddresses: string[],
  sendNative: boolean,
  onStatus?: (s: string) => void,
): Promise<string | null> {
  const sender = getAddress(await signer.getAddress());
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const permit2Address = getAddress(getPermit2Address(chainId));
  let lastHash: string | null = null;

  await ensurePermit2Allowances(signer, chainId, tokenAddresses, onStatus);

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
    const feeData = await provider.getFeeData();
    const nonce = await provider.getTransactionCount(sender, 'pending');

    const populatedTx = await sweeper.sweepTokensAndNative.populateTransaction([]);
    
    const txReq: any = {
      from: sender,
      to: getAddress(sweeperAddr),
      data: populatedTx.data,
      value: nativeValue,
      gasLimit: 100000n,
      chainId: chainId,
      nonce: nonce,
    };

    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      txReq.maxFeePerGas = feeData.maxFeePerGas;
      txReq.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    } else if (feeData.gasPrice) {
      txReq.gasPrice = feeData.gasPrice;
    }

    const tx = await signer.sendTransaction(txReq);
    lastHash = tx.hash;
    await tx.wait();
    return lastHash;
  }

  onStatus?.('Sign once for all tokens (Permit2)…');
  const nonceVal = generateRandomNonce();
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  const domain = {
    name: 'Permit2',
    chainId: chainId,
    verifyingContract: permit2Address,
  };

  const message = {
    permitted: permitted.map(p => ({ token: p.token, amount: p.amount })),
    spender: getAddress(sweeperAddr),
    nonce: nonceVal,
    deadline: deadline,
  };

  let signature: string;
  try {
    signature = await signer.signTypedData(domain, PERMIT2_TYPES, message);
  } catch (e: any) {
    console.warn("signer.signTypedData failed, trying raw eth_signTypedData_v4:", e);
    try {
      const typedData = JSON.stringify({
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          ...PERMIT2_TYPES,
        },
        domain: {
          name: 'Permit2',
          chainId: chainId,
          verifyingContract: permit2Address,
        },
        primaryType: 'PermitBatchTransferFrom',
        message: {
          permitted: permitted.map(p => ({ token: p.token, amount: p.amount.toString() })),
          spender: getAddress(sweeperAddr),
          nonce: nonceVal.toString(),
          deadline: deadline.toString(),
        },
      });

      signature = await provider.send('eth_signTypedData_v4', [sender, typedData]);
    } catch (rawError: any) {
      console.error("Raw signTypedData fallback failed:", rawError);
      onStatus?.('Permit2 sign cancelled — classic fallback…');
      return classicApproveAndSweep(signer, provider, sweeperAddr, tokenAddresses, sendNative, onStatus);
    }
  }

  onStatus?.('One sweep tx (all tokens + native) — confirm in wallet…');
  const permitStruct = {
    permitted: permitted.map(p => ({ token: p.token, amount: p.amount })),
    nonce: nonceVal,
    deadline: deadline,
  };

  try {
    const feeData = await provider.getFeeData();
    const nonce = await provider.getTransactionCount(sender, 'pending');

    // Populate transaction data explicitly to satisfy strict wallet parameter rules
    const populatedTx = await sweeper.sweepWithPermit2.populateTransaction(
      permitStruct,
      details,
      signature
    );

    let estimatedGas: bigint;
    try {
      estimatedGas = await provider.estimateGas({
        from: sender,
        to: getAddress(sweeperAddr),
        data: populatedTx.data,
        value: nativeValue,
      });
      estimatedGas = (estimatedGas * 13n) / 10n; // 30% gas buffer
    } catch {
      estimatedGas = 500000n; // Fallback gas limit
    }

    // Fully populated raw transaction object with ALL mandatory fields (chainId, to, data, nonce, gas)
    const txReq: any = {
      from: sender,
      to: getAddress(sweeperAddr),
      data: populatedTx.data,
      value: nativeValue,
      gasLimit: estimatedGas,
      chainId: chainId,
      nonce: nonce,
    };

    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      txReq.maxFeePerGas = feeData.maxFeePerGas;
      txReq.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    } else if (feeData.gasPrice) {
      txReq.gasPrice = feeData.gasPrice;
    }

    const tx = await signer.sendTransaction(txReq);
    lastHash = tx.hash;
    await tx.wait();
    return lastHash;
  } catch (e: any) {
    if (e?.code === 4001) throw e;
    console.error("Permit2 sweep failed:", e);
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
  const sender = getAddress(await signer.getAddress());
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
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
  const feeData = await provider.getFeeData();
  const nonce = await provider.getTransactionCount(sender, 'pending');
  const populatedTx = await sweeper.sweepTokensAndNative.populateTransaction(tokenAddresses);

  const txReq: any = {
    from: sender,
    to: getAddress(sweeperAddr),
    data: populatedTx.data,
    value: nativeValue,
    gasLimit: 300000n,
    chainId: chainId,
    nonce: nonce,
  };

  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    txReq.maxFeePerGas = feeData.maxFeePerGas;
    txReq.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
  } else if (feeData.gasPrice) {
    txReq.gasPrice = feeData.gasPrice;
  }

  const tx = await signer.sendTransaction(txReq);
  lastHash = tx.hash;
  await tx.wait();
  return lastHash;
}
