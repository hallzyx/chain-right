import hre from "hardhat";

const { ethers } = hre;

/**
 * Deploy script para ChainRightERC721 en 0G Chain.
 * 
 * Para ejecutar en Testnet (Galileo):
 * npx hardhat run scripts/deploy.ts --network 0g-testnet
 * 
 * Para ejecutar en Mainnet (Aristotle):
 * npx hardhat run scripts/deploy.ts --network 0g-mainnet
 * 
 * Necesitas:
 * 1. PRIVATE_KEY en .env
 * 2. Tokens 0G para gas (pedir del faucet: https://faucet.0g.ai)
 */

async function main() {
  console.log("========================================");
  console.log("Deploying ChainRightERC721...");
  console.log("========================================");

  const [deployer] = await ethers.getSigners();

  console.log("Deploying with wallet:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // Deploy del contrato
  const ChainRightERC721 = await ethers.getContractFactory("ChainRightERC721");
  const chainRight = await ChainRightERC721.deploy();

  await chainRight.waitForDeployment();

  const address = await chainRight.getAddress();

  console.log("");
  console.log("✅ Deployment successful!");
  console.log("");
  console.log("Contract Address:", address);
  console.log("");
  console.log("========================================");
  console.log("Next steps:");
  console.log("========================================");
  console.log("1. Copy this address to your .env:");
  console.log("   NEXT_PUBLIC_CONTRACT_ADDRESS=" + address);
  console.log("");
  console.log("2. Verify the contract on the explorer:");
  console.log("   https://chainscan-galileo.0g.ai/verifyContract");
  console.log("");
  console.log("3. Try minting your first NFT!");
  console.log("");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
