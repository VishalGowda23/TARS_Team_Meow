const fs = require('fs');
const FormData = require('form-data');
const { default: fetch } = require('node-fetch');

async function testEndToEndSubmission() {
  console.log('🧪 Testing End-to-End Submission API...\n');

  try {
    // 1. Create test file
    const testContent = Buffer.from('This is test evidence content for TARS whistleblowing platform');
    const filename = 'test-evidence.txt';
    
    // 2. Prepare form data
    const form = new FormData();
    form.append('evidence', testContent, {
      filename: filename,
      contentType: 'text/plain'
    });

    console.log('📤 Submitting evidence to Person B...');
    
    // 3. Submit to Person B
    const response = await fetch('http://localhost:3001/api/submit', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'TARSTestClient/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Submission successful!');
    console.log('📋 Response:', JSON.stringify(result, null, 2));

    // 4. Test storage integration if we have a stageId
    if (result.data && result.data.stageId) {
      console.log('\n🔗 Testing Person D integration...');
      
      const storageRequest = {
        stageId: result.data.stageId,
        evidenceHash: result.data.evidenceHash,
        encryptionRequired: true
      };

      const storageResponse = await fetch('http://localhost:3000/api/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Auth': 'test-key'
        },
        body: JSON.stringify(storageRequest)
      });

      if (storageResponse.ok) {
        const storageResult = await storageResponse.json();
        console.log('✅ Storage integration successful!');
        console.log('📦 Storage Response:', JSON.stringify(storageResult, null, 2));
      } else {
        console.log('⚠️ Storage integration failed:', storageResponse.status, storageResponse.statusText);
        const errorText = await storageResponse.text();
        console.log('Error details:', errorText);
      }
    }

    return result;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

async function testHealthEndpoints() {
  console.log('\n🏥 Testing Health Endpoints...\n');
  
  try {
    // Test Person B health
    const personBHealth = await fetch('http://localhost:3001/api/health');
    if (personBHealth.ok) {
      const health = await personBHealth.json();
      console.log('✅ Person B Health:', JSON.stringify(health, null, 2));
    } else {
      console.log('⚠️ Person B health check failed');
    }

    // Test Person D ping
    const personDPing = await fetch('http://localhost:3000/ping');
    if (personDPing.ok) {
      const ping = await personDPing.json();
      console.log('✅ Person D Ping:', JSON.stringify(ping, null, 2));
    } else {
      console.log('⚠️ Person D ping failed');
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 TARS Integration Tests\n');
  console.log('=' .repeat(50));
  
  await testHealthEndpoints();
  await testEndToEndSubmission();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndToEndSubmission, testHealthEndpoints };