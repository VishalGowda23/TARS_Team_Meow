const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 TARS 2.0 - Decentralized Secure Disclosure Network");
  console.log("📦 Deploying TARS Contract to Sepolia...");
  console.log("=" * 60);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  
  console.log("🔑 Deploying from account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Configuration
  const MIN_APPROVALS = 2; // Minimum validators needed for evidence verification
  
  console.log("⚙️  Configuration:");
  console.log("   - Min Approvals Required:", MIN_APPROVALS);
  console.log("");

  // Deploy the contract
  const TARS = await ethers.getContractFactory("TARS");
  console.log("🔨 Deploying contract...");
  
  const tars = await TARS.deploy(MIN_APPROVALS);
  
  console.log("⏳ Waiting for deployment confirmation...");
  await tars.waitForDeployment();
  
  const contractAddress = await tars.getAddress();
  const network = await ethers.provider.getNetwork();
  
  console.log("✅ TARS Contract deployed successfully!");
  console.log("=" * 60);
  console.log("📍 Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("🏠 Contract Address:", contractAddress);
  console.log("🧑‍💻 SuperAdmin:", deployer.address);
  console.log("⚡ Min Approvals:", MIN_APPROVALS);
  console.log("=" * 60);
  
  // Verify initial state
  console.log("🔍 Verifying deployment...");
  const superAdmin = await tars.superAdmin();
  const minApprovals = await tars.minApprovals();
  const evidenceCounter = await tars.evidenceCounter();
  
  console.log("   ✓ SuperAdmin:", superAdmin);
  console.log("   ✓ Min Approvals:", minApprovals.toString());
  console.log("   ✓ Evidence Counter:", evidenceCounter.toString());
  
  if (superAdmin === deployer.address && minApprovals === BigInt(MIN_APPROVALS) && evidenceCounter === 0n) {
    console.log("🎉 All deployment checks passed!");
  } else {
    console.error("❌ Deployment verification failed!");
    process.exit(1);
  }
  
  console.log("");
  console.log("📋 Next Steps:");
  console.log("   1. Verify contract on Etherscan:");
  console.log(`      npx hardhat verify --network sepolia ${contractAddress} ${MIN_APPROVALS}`);
  console.log("");
  console.log("   2. Add employees:");
  console.log(`      await tars.addEmployee("0x...employee_address")`);
  console.log("");
  console.log("   3. Add validators:");
  console.log(`      await tars.addValidator("0x...validator_address")`);
  console.log("");
  console.log("🔗 Block Explorer:");
  console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log("=" * 60);
  
  return {
    contractAddress,
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    minApprovals: MIN_APPROVALS
  };
}

// Execute deployment
main()
  .then((result) => {
    console.log("✅ Deployment completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });