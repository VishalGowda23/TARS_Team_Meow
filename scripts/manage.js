const { ethers } = require("hardhat");

/**
 * Contract interaction script for managing TARS after deployment
 */

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "DEPLOY_FIRST";

async function main() {
  if (CONTRACT_ADDRESS === "DEPLOY_FIRST") {
    console.log("❌ Please deploy the contract first and set CONTRACT_ADDRESS in environment");
    console.log("   Run: npx hardhat run scripts/deploy.js --network sepolia");
    return;
  }

  console.log("🔧 TARS Contract Management");
  console.log("=" * 60);
  console.log("📍 Contract Address:", CONTRACT_ADDRESS);
  
  const [deployer] = await ethers.getSigners();
  console.log("🔑 Interacting from:", deployer.address);
  
  // Connect to deployed contract
  const TARS = await ethers.getContractFactory("TARS");
  const tars = TARS.attach(CONTRACT_ADDRESS);
  
  // Verify contract state
  console.log("\n🔍 Current Contract State:");
  try {
    const superAdmin = await tars.superAdmin();
    const minApprovals = await tars.minApprovals();
    const evidenceCounter = await tars.evidenceCounter();
    
    console.log("   🧑‍💻 SuperAdmin:", superAdmin);
    console.log("   ⚡ Min Approvals:", minApprovals.toString());
    console.log("   📊 Evidence Count:", evidenceCounter.toString());
    
    // Example role management (uncomment and modify as needed)
    /*
    console.log("\n👥 Adding Test Employees and Validators...");
    
    // Add employees (replace with actual addresses)
    const employeeAddresses = [
      "0x1234...employee1",
      "0x5678...employee2"
    ];
    
    for (const employee of employeeAddresses) {
      const isEmployee = await tars.isEmployee(employee);
      if (!isEmployee) {
        await tars.addEmployee(employee);
        console.log("   ✓ Added Employee:", employee);
      } else {
        console.log("   ℹ️  Employee already exists:", employee);
      }
    }
    
    // Add validators (replace with actual addresses)  
    const validatorAddresses = [
      "0x9abc...validator1",
      "0xdef0...validator2",
      "0x1357...validator3"
    ];
    
    for (const validator of validatorAddresses) {
      const isValidator = await tars.isValidator(validator);
      if (!isValidator) {
        await tars.addValidator(validator);
        console.log("   ✓ Added Validator:", validator);
      } else {
        console.log("   ℹ️  Validator already exists:", validator);
      }
    }
    */
    
  } catch (error) {
    console.error("❌ Error interacting with contract:", error.message);
  }
  
  console.log("\n📋 Management Commands:");
  console.log("   Add Employee: await tars.addEmployee('0x...')");
  console.log("   Add Validator: await tars.addValidator('0x...')");
  console.log("   Remove Employee: await tars.removeEmployee('0x...')");
  console.log("   Remove Validator: await tars.removeValidator('0x...')");
  console.log("   Get Evidence: await tars.getEvidence(1)");
  console.log("=" * 60);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });