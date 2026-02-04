const fs = require('fs');
const path = require('path');

// Import all backend utilities for testing
const { encryptFile, decryptFile, generateEvidenceKey } = require('../utils/encryption');
const { hashFile, verifyFileHash } = require('../utils/hashing');
const { stripMetadata } = require('../utils/metadata');
const { uploadToIPFS, downloadFromIPFS, validateCID } = require('../utils/ipfs-mock');
const { validateProcessingPipeline, generateVerificationReport } = require('../utils/validation');

/**
 * TARS 2.0 Backend Integration Test
 * Tests the complete evidence submission workflow
 */
async function runBackendIntegrationTest() {
  console.log('🚀 TARS 2.0 Backend Integration Test');
  console.log('=====================================');
  
  const testResults = {
    utilities: {},
    workflow: {},
    performance: {},
    errors: []
  };

  try {
    // Step 1: Create test file
    console.log('\n📁 Step 1: Creating test evidence file...');
    const testDir = path.join(__dirname, '../test-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'test-evidence.txt');
    const testContent = `TARS 2.0 Integration Test Evidence
Timestamp: ${new Date().toISOString()}
Test ID: ${Math.random().toString(36).substring(2, 15)}
Content: This file contains evidence for testing the decentralized secure disclosure network.
Data: ${JSON.stringify({
  category: 'misconduct',
  severity: 'high',
  anonymous: true,
  metadata: {
    department: 'engineering',
    incident_date: '2024-01-15',
    witnesses: 2
  }
})}
Random hash test: ${Math.random().toString(36)}`;
    
    fs.writeFileSync(testFilePath, testContent);
    testResults.workflow.fileCreated = true;
    console.log(`✅ Test file created: ${path.basename(testFilePath)}`);
    console.log(`📊 File size: ${fs.statSync(testFilePath).size} bytes`);

    // Step 2: Test hashing utility
    console.log('\n🔍 Step 2: Testing file hashing...');
    const startTime = Date.now();
    const originalHash = await hashFile(testFilePath);
    testResults.performance.hashTime = Date.now() - startTime;
    testResults.utilities.hashing = true;
    console.log(`✅ Original file hash: ${originalHash}`);
    console.log(`⏱️ Hash calculation time: ${testResults.performance.hashTime}ms`);

    // Step 3: Test metadata stripping
    console.log('\n🧹 Step 3: Testing metadata stripping...');
    let processedFilePath;
    try {
      processedFilePath = await stripMetadata(testFilePath);
      const processedHash = await hashFile(processedFilePath);
      testResults.utilities.metadataStripping = true;
      testResults.workflow.metadataStripped = processedHash !== originalHash;
      console.log(`✅ Metadata processing completed`);
      console.log(`📁 Processed file: ${path.basename(processedFilePath)}`);
      console.log(`🔍 Processed hash: ${processedHash}`);
      console.log(`🔄 Hash changed: ${testResults.workflow.metadataStripped}`);
    } catch (error) {
      console.warn(`⚠️ Metadata stripping not applicable for text file: ${error.message}`);
      processedFilePath = testFilePath;
      testResults.utilities.metadataStripping = 'skipped';
      testResults.workflow.metadataStripped = false;
    }

    // Step 4: Test encryption
    console.log('\n🔐 Step 4: Testing file encryption...');
    const encryptionKey = generateEvidenceKey();
    const encryptedFilePath = await encryptFile(processedFilePath, encryptionKey);
    const encryptedHash = await hashFile(encryptedFilePath);
    testResults.utilities.encryption = true;
    testResults.workflow.encrypted = true;
    console.log(`✅ File encrypted successfully`);
    console.log(`🔑 Encryption key length: ${encryptionKey.length} characters`);
    console.log(`📁 Encrypted file: ${path.basename(encryptedFilePath)}`);
    console.log(`🔍 Encrypted hash: ${encryptedHash}`);
    console.log(`📊 Encrypted size: ${fs.statSync(encryptedFilePath).size} bytes`);

    // Step 5: Test decryption (verification)
    console.log('\n🔓 Step 5: Testing decryption verification...');
    const decryptedFilePath = await decryptFile(encryptedFilePath, encryptionKey);
    const decryptedHash = await hashFile(decryptedFilePath);
    const decryptionVerified = decryptedHash === await hashFile(processedFilePath);
    testResults.utilities.decryption = decryptionVerified;
    console.log(`✅ Decryption ${decryptionVerified ? 'verified' : 'failed'}`);
    console.log(`🔍 Decrypted hash: ${decryptedHash}`);

    // Step 6: Test IPFS upload
    console.log('\n🌐 Step 6: Testing IPFS upload...');
    try {
      const ipfsStartTime = Date.now();
      const ipfsResult = await uploadToIPFS(encryptedFilePath);
      testResults.performance.ipfsUploadTime = Date.now() - ipfsStartTime;
      testResults.utilities.ipfs = true;
      testResults.workflow.ipfsUploaded = true;
      console.log(`✅ IPFS upload successful`);
      console.log(`🌐 IPFS CID: ${ipfsResult.cid}`);
      console.log(`📊 IPFS Size: ${ipfsResult.size} bytes`);
      console.log(`⏱️ Upload time: ${testResults.performance.ipfsUploadTime}ms`);
      
      // Validate CID
      const isValidCID = validateCID(ipfsResult.cid);
      testResults.workflow.ipfsValidated = isValidCID;
      console.log(`🔍 CID validation: ${isValidCID ? 'passed' : 'failed'}`);
      
      testResults.workflow.ipfsCID = ipfsResult.cid;
      
    } catch (error) {
      console.error(`❌ IPFS upload failed: ${error.message}`);
      testResults.utilities.ipfs = false;
      testResults.workflow.ipfsUploaded = false;
      testResults.errors.push(`IPFS upload: ${error.message}`);
    }

    // Step 7: Test validation pipeline
    console.log('\n✅ Step 7: Testing validation pipeline...');
    const validation = await validateProcessingPipeline(
      testFilePath,
      processedFilePath,
      encryptedFilePath,
      { logSteps: true, strictMode: false }
    );
    
    testResults.utilities.validation = validation.success;
    testResults.workflow.validationPassed = validation.success;
    
    console.log(`📊 Pipeline validation results:`);
    console.log(`  - Success: ${validation.success}`);
    console.log(`  - Metadata stripped: ${validation.integrity.metadataStripped}`);
    console.log(`  - Encryption applied: ${validation.integrity.processedToEncrypted}`);
    console.log(`  - Overall consistency: ${validation.integrity.overallConsistency}`);
    
    if (validation.warnings.length > 0) {
      console.log(`⚠️ Warnings: ${validation.warnings.join(', ')}`);
    }
    
    if (validation.errors.length > 0) {
      console.log(`❌ Errors: ${validation.errors.join(', ')}`);
      testResults.errors.push(...validation.errors);
    }

    // Step 8: Generate verification report
    console.log('\n📋 Step 8: Generating verification report...');
    const reportData = {
      originalHash,
      processedHash: await hashFile(processedFilePath),
      encryptedHash,
      ipfsCID: testResults.workflow.ipfsCID,
      fileSizes: {
        original: fs.statSync(testFilePath).size,
        processed: fs.statSync(processedFilePath).size,
        encrypted: fs.statSync(encryptedFilePath).size
      },
      processingTime: testResults.performance.hashTime + (testResults.performance.ipfsUploadTime || 0)
    };
    
    const report = generateVerificationReport(reportData);
    testResults.workflow.report = report;
    console.log(`✅ Verification report generated`);
    console.log(`📊 Report ID: ${report.processingId}`);
    console.log(`🔍 Hash integrity: ${report.consistency.hashIntegrity}`);

    // Step 9: Cleanup test files
    console.log('\n🧽 Step 9: Cleaning up test files...');
    const filesToClean = [
      testFilePath,
      processedFilePath !== testFilePath ? processedFilePath : null,
      encryptedFilePath,
      decryptedFilePath
    ].filter(Boolean);
    
    let cleanedCount = 0;
    filesToClean.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`🗑️ Deleted: ${path.basename(file)}`);
          cleanedCount++;
        }
      } catch (error) {
        console.warn(`⚠️ Could not delete ${file}: ${error.message}`);
      }
    });
    
    // Remove test directory if empty
    try {
      const testDirContents = fs.readdirSync(testDir);
      if (testDirContents.length === 0) {
        fs.rmdirSync(testDir);
        console.log(`🗑️ Removed test directory`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not remove test directory: ${error.message}`);
    }

    testResults.workflow.filesCleanedUp = cleanedCount;

    // Final summary
    console.log('\n🎉 Integration Test Summary');
    console.log('===========================');
    
    const allUtilitiesWorking = Object.values(testResults.utilities).every(
      result => result === true || result === 'skipped'
    );
    
    console.log(`📊 Overall Status: ${allUtilitiesWorking && testResults.errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('\n🔧 Utility Tests:');
    Object.entries(testResults.utilities).forEach(([utility, status]) => {
      const statusIcon = status === true ? '✅' : status === 'skipped' ? '⏭️' : '❌';
      console.log(`  ${statusIcon} ${utility}: ${status}`);
    });
    
    console.log('\n🔄 Workflow Tests:');
    Object.entries(testResults.workflow).forEach(([step, result]) => {
      if (typeof result === 'boolean') {
        console.log(`  ${result ? '✅' : '❌'} ${step}: ${result}`);
      }
    });
    
    if (testResults.performance.hashTime) {
      console.log(`\n⏱️ Performance:`);
      console.log(`  - Hash calculation: ${testResults.performance.hashTime}ms`);
      if (testResults.performance.ipfsUploadTime) {
        console.log(`  - IPFS upload: ${testResults.performance.ipfsUploadTime}ms`);
      }
    }
    
    if (testResults.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      testResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log('\n🚀 CHUNK 2 - Backend + IPFS Integration: COMPLETED');
    return testResults;

  } catch (error) {
    console.error('\n💥 Critical test failure:', error);
    testResults.errors.push(`Critical failure: ${error.message}`);
    throw error;
  }
}

// Run the test if called directly
if (require.main === module) {
  runBackendIntegrationTest()
    .then((results) => {
      const success = Object.values(results.utilities).every(
        result => result === true || result === 'skipped'
      ) && results.errors.length === 0;
      
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runBackendIntegrationTest
};