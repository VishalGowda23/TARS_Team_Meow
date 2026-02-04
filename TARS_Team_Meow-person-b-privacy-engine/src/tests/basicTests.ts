import { MetadataStripper } from '../services/metadataStripper';
import { EvidenceHasher } from '../services/evidenceHasher';
import { EncryptedStaging } from '../services/encryptedStaging';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`✅ ${message}`);
};

async function testMetadataStripper() {
  console.log('\n📋 Testing Metadata Stripper...\n');
  
  const stripper = new MetadataStripper();
  
  // Test 1: Supported types
  const supportedTypes = stripper.getSupportedTypes();
  assert(supportedTypes.length > 0, 'Has supported file types');
  assert(supportedTypes.includes('image/jpeg'), 'Supports JPEG');
  assert(supportedTypes.includes('application/pdf'), 'Supports PDF');
  
  // Test 2: Filename sanitization
  const testBuffer = Buffer.from('test content');
  const result = await stripper.stripMetadata(
    testBuffer,
    'my_secret_document_by_john_doe.txt',
    'text/plain'
  );
  
  assert(!result.sanitizedName.includes('john'), 'Removes author from filename');
  assert(!result.sanitizedName.includes('secret'), 'Sanitizes sensitive words');
  assert(result.sanitizedName.startsWith('evidence_'), 'Uses anonymous naming');
  
  console.log(`   Sanitized: "${result.sanitizedName}"`);
}

async function testEvidenceHasher() {
  console.log('\n🔐 Testing Evidence Hasher...\n');
  
  const hasher = new EvidenceHasher();
  const testBuffer = Buffer.from('This is test evidence content');
  
  // Test 1: Generate hash
  const hash = hasher.generateHash(testBuffer);
  
  assert(hash.sha256.length === 64, 'SHA-256 hash is 64 characters');
  assert(hash.sha512!.length === 128, 'SHA-512 hash is 128 characters');
  assert(hash.fileSize === testBuffer.length, 'File size is correct');
  
  console.log(`   SHA-256: ${hash.sha256.substring(0, 32)}...`);
  
  // Test 2: Verify hash
  const verification = hasher.verifyHash(testBuffer, hash.sha256);
  assert(verification.isValid, 'Hash verification passes');
  
  // Test 3: Wrong hash should fail
  const wrongVerification = hasher.verifyHash(testBuffer, 'wronghash'.repeat(8));
  assert(!wrongVerification.isValid, 'Wrong hash verification fails');
  
  // Test 4: Hash format validation
  assert(hasher.isValidHashFormat(hash.sha256, 'sha256'), 'Valid SHA-256 format');
  assert(!hasher.isValidHashFormat('tooshort', 'sha256'), 'Invalid hash rejected');
  
  // Test 5: Deterministic hashing
  const hash2 = hasher.generateHash(testBuffer);
  assert(hash.sha256 === hash2.sha256, 'Same content produces same hash');
  
  // Test 6: Different content produces different hash
  const differentBuffer = Buffer.from('Different content');
  const hash3 = hasher.generateHash(differentBuffer);
  assert(hash.sha256 !== hash3.sha256, 'Different content produces different hash');
}

async function testEncryptedStaging() {
  console.log('\n🔒 Testing Encrypted Staging...\n');
  
  const staging = new EncryptedStaging({
    ttlSeconds: 60,
    maxAccessCount: 3
  });
  
  const testBuffer = Buffer.from('Sensitive evidence data');
  const hasher = new EvidenceHasher();
  const evidenceHash = hasher.generateHash(testBuffer);
  
  // Test 1: Stage evidence
  const staged = await staging.stageEvidence(testBuffer, evidenceHash);
  
  assert(staged.stageId.startsWith('stage_'), 'Stage ID has correct prefix');
  assert(staged.encryptedBuffer.length > 0, 'Evidence is encrypted');
  assert(staged.encryptedBuffer.toString() !== testBuffer.toString(), 'Content is encrypted');
  assert(staged.accessCount === 0, 'Access count starts at 0');
  
  console.log(`   Stage ID: ${staged.stageId}`);
  
  // Test 2: Retrieve evidence
  const retrieved = staging.retrieveEvidence(staged.stageId);
  assert(retrieved !== null, 'Evidence retrieved successfully');
  assert(retrieved!.equals(testBuffer), 'Decrypted content matches original');
  
  // Test 3: Access count increments
  const info = staging.getStagedInfo(staged.stageId);
  assert(info?.accessCount === 1, 'Access count incremented');
  
  // Test 4: Retrieve until limit
  staging.retrieveEvidence(staged.stageId); // Access 2
  staging.retrieveEvidence(staged.stageId); // Access 3
  
  const blockedAccess = staging.retrieveEvidence(staged.stageId);
  assert(blockedAccess === null, 'Access blocked after limit reached');
  
  // Test 5: Stats
  const stats = staging.getStats();
  assert(typeof stats.activeStages === 'number', 'Stats available');
  
  console.log(`   Active stages: ${stats.activeStages}`);
  
  // Cleanup
  staging.cleanup();
}

async function testFullFlow() {
  console.log('\n🔄 Testing Full Submission Flow...\n');
  
  const stripper = new MetadataStripper();
  const hasher = new EvidenceHasher();
  const staging = new EncryptedStaging({ ttlSeconds: 60, maxAccessCount: 3 });
  
  // Simulate file upload
  const fakeFileContent = Buffer.from('Fake image content with metadata');
  const filename = 'evidence_photo_from_whistleblower.jpg';
  const mimeType = 'image/jpeg';

  console.log('   1. Stripping metadata...');
  const stripped = await stripper.stripMetadata(fakeFileContent, filename, mimeType);

  console.log('   2. Generating hash...');
  const hash = hasher.generateHash(stripped.cleanBuffer);

  console.log('   3. Staging evidence...');
  const staged = await staging.stageEvidence(stripped.cleanBuffer, hash);

  console.log('   4. Verifying staged evidence...');
  const retrieved = staging.retrieveEvidence(staged.stageId);
  const verification = hasher.verifyHash(retrieved!, hash.sha256);
  
  assert(verification.isValid, 'Full flow integrity verified');
  
  console.log(`
   ✅ Flow complete!
   - Original file: ${filename}
   - Sanitized name: ${stripped.sanitizedName}
   - Evidence hash: ${hash.sha256.substring(0, 16)}...
   - Stage ID: ${staged.stageId}
   - Verified: ${verification.isValid}
  `);
  
  staging.cleanup();
}

async function runTests() {
  console.log('TARS Privacy Engine - Test Suite');
  
  try {
    await testMetadataStripper();
    await testEvidenceHasher();
    await testEncryptedStaging();
    await testFullFlow();
    
    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
