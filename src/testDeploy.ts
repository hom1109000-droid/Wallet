import { BrowserProvider, ContractFactory } from 'ethers';

const TEST_BYTECODE = '0x6001600c60003960016000f300';

export async function testContractDeployment() {
  if (!window.ethereum) {
    throw new Error('No wallet provider found.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const network = await provider.getNetwork();
  console.log('TEST NETWORK:', Number(network.chainId));

  const factory = new ContractFactory([], TEST_BYTECODE, signer);
  const contract = await factory.deploy();

  console.log('DEPLOYMENT TX:', contract.deploymentTransaction()?.hash);

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('TEST CONTRACT:', address);

  return address;
}
