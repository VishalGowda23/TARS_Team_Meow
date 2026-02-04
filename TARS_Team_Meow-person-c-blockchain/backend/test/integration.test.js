const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');

// Create test file for upload testing
const createTestFile = () => {
  const testDir = path.join(__dirname, '../test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const testFilePath = path.join(testDir, 'test-evidence.txt');
  const testContent = `TARS 2.0 Test Evidence File
Created: ${new Date().toISOString()}
Content: This is a test file for evidence submission workflow validation.
Hash Test: ${Math.random().toString(36)}`;
  
  fs.writeFileSync(testFilePath, testContent);
  return testFilePath;
};

// Integration test suite
describe('TARS 2.0 Evidence Submission Integration Tests', () => {
  let testFilePath;
  
  beforeAll(() => {
    console.log('🧪 Setting up integration tests...');
    testFilePath = createTestFile();
  });

  afterAll(() => {
    // Clean up test files
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      const testDir = path.join(__dirname, '../test-files');
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    } catch (error) {
      console.warn('⚠️ Test cleanup warning:', error.message);
    }
  });

  test('Health endpoint should respond successfully', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('healthy');
    console.log('✅ Health check passed');
  });

  test('Evidence status endpoint should show all services active', async () => {
    const response = await request(app)
      .get('/api/evidence/status')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.services.encryption).toBe('active');
    expect(response.body.services.hashing).toBe('active');
    expect(response.body.services.ipfs).toBe('connected');
    expect(response.body.services.metadata).toBe('active');
    console.log('✅ Evidence status check passed');
  });

  test('Complete evidence submission workflow', async () => {
    console.log('🚀 Testing complete evidence submission workflow...');
    
    const response = await request(app)
      .post('/api/evidence/submit')
      .attach('evidenceFile', testFilePath)
      .field('submitterRole', 'employee')
      .field('category', 'misconduct')
      .field('description', 'Integration test evidence submission')
      .field('urgent', 'false')
      .expect(200);

    // Validate response structure
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Evidence submitted successfully');
    
    // Validate evidence data
    const evidenceData = response.body.data;
    expect(evidenceData.evidenceId).toBeDefined();
    expect(evidenceData.ipfsCID).toBeDefined();
    expect(evidenceData.fileHash).toBeDefined();
    expect(evidenceData.encryptionKey).toBeDefined();
    
    // Validate metadata
    const metadata = evidenceData.metadata;
    expect(metadata.submitterRole).toBe('employee');
    expect(metadata.category).toBe('misconduct');
    expect(metadata.file.originalName).toBe('test-evidence.txt');
    expect(metadata.verification.hashesConsistent).toBe(true);
    expect(metadata.verification.ipfsValidated).toBe(true);
    
    // Validate processing information
    const processing = evidenceData.processing;
    expect(processing.originalHash).toBeDefined();
    expect(processing.cleanHash).toBeDefined();
    expect(processing.encryptedHash).toBeDefined();
    expect(processing.hashVerification).toBe('passed');
    
    // Validate that hashes are different (indicating processing occurred)
    expect(processing.originalHash).not.toBe(processing.encryptedHash);
    
    console.log('✅ Evidence submission workflow completed successfully');
    console.log(`📁 Evidence ID: ${evidenceData.evidenceId}`);
    console.log(`🌐 IPFS CID: ${evidenceData.ipfsCID}`);
    console.log(`🔍 File Hash: ${evidenceData.fileHash}`);
  });

  test('Hash verification endpoint', async () => {
    const testHash = 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const sameHash = 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    const response = await request(app)
      .post('/api/evidence/verify-hash')
      .send({
        originalHash: testHash,
        currentHash: sameHash,
        ipfsCID: 'QmTestCID123456789'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.verification.hashesMatch).toBe(true);
    expect(response.body.verification.ipfsValid).toBe(false); // Test CID is invalid
    
    console.log('✅ Hash verification endpoint tested');
  });

  test('File upload validation - invalid file type', async () => {
    // Create a fake executable file
    const invalidFilePath = path.join(__dirname, '../test-files/malicious.exe');
    fs.writeFileSync(invalidFilePath, 'fake executable content');

    try {
      const response = await request(app)
        .post('/api/evidence/submit')
        .attach('evidenceFile', invalidFilePath)
        .field('submitterRole', 'employee')
        .expect(500); // Should fail due to invalid file type

      // Clean up
      fs.unlinkSync(invalidFilePath);
      console.log('✅ File type validation working correctly');
    } catch (error) {
      // Clean up in case of error
      if (fs.existsSync(invalidFilePath)) {
        fs.unlinkSync(invalidFilePath);
      }
      throw error;
    }
  });

  test('Missing file upload handling', async () => {
    const response = await request(app)
      .post('/api/evidence/submit')
      .field('submitterRole', 'employee')
      .field('category', 'misconduct')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('No file uploaded');
    
    console.log('✅ Missing file validation working correctly');
  });
});

// Manual integration test function for command line testing
async function runManualIntegrationTest() {
  console.log('🚀 TARS 2.0 Manual Integration Test');
  console.log('=====================================');
  
  try {
    // Test file creation
    console.log('\n📁 Creating test file...');
    const testFile = createTestFile();
    console.log(`✅ Test file created: ${testFile}`);
    
    // Test individual utilities
    console.log('\n🔧 Testing individual utilities...');
    
    const { hashFile } = require('../utils/hashing');
    const { encryptFile, generateEvidenceKey } = require('../utils/encryption');
    const { stripMetadata } = require('../utils/metadata');
    const { uploadToIPFS } = require('../utils/ipfs');
    const { validateProcessingPipeline } = require('../utils/validation');
    
    // Test hashing
    const originalHash = await hashFile(testFile);
    console.log(`🔍 Original hash: ${originalHash}`);
    
    // Test metadata stripping
    let processedFile;
    try {
      processedFile = await stripMetadata(testFile);
      console.log(`🧹 Metadata stripped: ${processedFile}`);
    } catch (error) {
      processedFile = testFile;
      console.log(`⚠️ Using original file (metadata stripping not applicable): ${error.message}`);
    }
    
    // Test encryption
    const encryptionKey = generateEvidenceKey();
    const encryptedFile = await encryptFile(processedFile, encryptionKey);
    console.log(`🔐 File encrypted: ${encryptedFile}`);
    
    // Test IPFS upload
    console.log('\n🌐 Testing IPFS upload...');
    const ipfsResult = await uploadToIPFS(encryptedFile);
    console.log(`📤 IPFS upload result:`, ipfsResult);
    
    // Test validation pipeline
    console.log('\n✅ Testing validation pipeline...');
    const validation = await validateProcessingPipeline(
      testFile,
      processedFile,
      encryptedFile,
      { logSteps: true }
    );
    
    console.log('📊 Validation results:');
    console.log(`  - Success: ${validation.success}`);
    console.log(`  - Original hash: ${validation.hashes.original}`);
    console.log(`  - Processed hash: ${validation.hashes.processed}`);
    console.log(`  - Encrypted hash: ${validation.hashes.encrypted}`);
    console.log(`  - Metadata stripped: ${validation.integrity.metadataStripped}`);
    console.log(`  - Encryption applied: ${validation.integrity.processedToEncrypted}`);
    
    // Cleanup
    console.log('\n🧽 Cleaning up test files...');
    [testFile, processedFile, encryptedFile].forEach(file => {
      if (file && fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log(`🗑️ Deleted: ${path.basename(file)}`);
        } catch (error) {
          console.warn(`⚠️ Could not delete ${file}: ${error.message}`);
        }
      }
    });
    
    console.log('\n🎉 Manual integration test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Manual integration test failed:', error);
    throw error;
  }
}

module.exports = {
  runManualIntegrationTest
};