const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying TARS contracts to", hre.network.name, "...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy TARS Token
  console.log("\n📦 Deploying TARSToken...");
  const TARSToken = await hre.ethers.getContractFactory("TARSToken");
  const tarsToken = await TARSToken.deploy();
  await tarsToken.waitForDeployment();
  const tokenAddress = await tarsToken.getAddress();
  console.log("✅ TARSToken deployed to:", tokenAddress);

  // Deploy main TARS contract
  console.log("\n📦 Deploying TARS...");
  const TARS = await hre.ethers.getContractFactory("TARS");
  const tars = await TARS.deploy();
  await tars.waitForDeployment();
  const tarsAddress = await tars.getAddress();
  console.log("✅ TARS deployed to:", tarsAddress);

  // Authorize TARS contract to mint tokens
  console.log("\n🔧 Configuring contracts...");
  const addMinterTx = await tarsToken.addMinter(tarsAddress);
  await addMinterTx.wait();
  console.log("✅ TARS contract authorized as token minter");

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(50));
  console.log("Network:", hre.network.name);
  console.log("TARSToken Address:", tokenAddress);
  console.log("TARS Address:", tarsAddress);
  console.log("Deployer:", deployer.address);
  console.log("=".repeat(50));

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployedAt: new Date().toISOString(),
    contracts: {
      TARSToken: tokenAddress,
      TARS: tarsAddress
    },
    deployer: deployer.address
  };

  fs.writeFileSync(
    `deployments/${hre.network.name}-deployment.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\n💾 Deployment info saved to deployments/${hre.network.name}-deployment.json`);

  // Verify contracts on Etherscan (Sepolia only)
  if (hre.network.name === "sepolia") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

    console.log("\n🔍 Verifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: tokenAddress,
        constructorArguments: []
      });
      console.log("✅ TARSToken verified");
    } catch (error) {
      console.log("⚠️ TARSToken verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: tarsAddress,
        constructorArguments: []
      });
      console.log("✅ TARS verified");
    } catch (error) {
      console.log("⚠️ TARS verification failed:", error.message);
    }
  }

  console.log("\n🎉 Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
