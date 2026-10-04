import {
  BrowserProvider,
  ContractFactory,
} from 'ethers';

const TEST_ABI = [
  'constructor()',
  'function value() view returns (uint256)',
];

const TEST_BYTECODE =
  '0x6080604052348015600e575f80fd5b506040516101003803806101008339818101604081905261002e91610059565b5f80546001600160a01b0319163317905561008e565b5f80fd5b90515f80546001600160a01b03191690555f80546001600160a01b0319169055565b5f80546001600160a01b0316815260205260405f205490565b5f80546001600160a01b0316815260205260405f20549056';

export async function testContractDeployment() {
  if (!window.ethereum) {
    throw new Error('No wallet provider found.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const network = await provider.getNetwork();

  console.log('TEST NETWORK:', Number(network.chainId));

  const factory = new ContractFactory(
    TEST_ABI,
    TEST_BYTECODE,
    signer,
  );

  const contract = await factory.deploy();

  console.log(
    'DEPLOYMENT TX:',
    contract.deploymentTransaction()?.hash,
  );

  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log('TEST CONTRACT:', address);

  return address;
}
