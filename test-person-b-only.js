const { default: fetch } = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

console.log('🚀 TARS Person B Privacy Engine Tests\n');
console.log('==================================================\n');

async function runTests() {
    // Test 1: Health Check
    console.log('🏥 Testing Health Endpoint...\n');
    try {
        const response = await fetch('http://localhost:3001/health');
        const health = await response.json();
        console.log('✅ Person B Health:', JSON.stringify(health, null, 2));
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
        return;
    }

    // Test 2: Evidence Submission with Different File Types
    const testCases = [
        {
            name: 'Text Evidence',
            content: 'SENSITIVE: Financial misconduct evidence - $2.5M misappropriated funds',
            filename: 'evidence.txt',
            contentType: 'text/plain'
        },
        {
            name: 'JSON Evidence', 
            content: JSON.stringify({
                type: "financial_fraud",
                amount: 2500000,
                accounts: ["acc123", "acc456"],
                evidence_urls: ["https://internal.company.com/doc1", "https://internal.company.com/doc2"],
                witness_contacts: ["john.doe@company.com", "jane.smith@company.com"]
            }),
            filename: 'evidence.json',
            contentType: 'application/json'
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n📤 Testing ${testCase.name} Submission...\n`);
        
        try {
            const form = new FormData();
            form.append('evidence', Buffer.from(testCase.content), {
                filename: testCase.filename,
                contentType: testCase.contentType
            });
            form.append('whistleblowerId', 'test-whistleblower-001');

            const response = await fetch('http://localhost:3001/api/submit', {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Submission successful!');
                console.log('📋 Response:', JSON.stringify(result, null, 2));
                
                // Test retrieval of staged evidence
                if (result.data && result.data.stageId) {
                    console.log(`\n🔍 Testing staged evidence retrieval for ${testCase.name}...`);
                    
                    const stageResponse = await fetch(`http://localhost:3001/api/retrieve/${result.data.stageId}`);
                    if (stageResponse.ok) {
                        const stageData = await stageResponse.json();
                        console.log('✅ Stage retrieval successful!');
                        console.log('📋 Staged Data:', JSON.stringify(stageData, null, 2));
                    } else {
                        console.log('❌ Stage retrieval failed:', await stageResponse.text());
                    }
                }
                
            } else {
                console.log('❌ Submission failed:', await response.text());
            }
        } catch (error) {
            console.log('❌ Test failed:', error.message);
        }
    }

    // Test 3: Tor Routing Check
    console.log('\n🔐 Testing Tor Routing Service...\n');
    try {
        const response = await fetch('http://localhost:3001/api/tor-status');
        if (response.ok) {
            const torStatus = await response.json();
            console.log('✅ Tor Status Retrieved:');
            console.log('📋 Status:', JSON.stringify(torStatus, null, 2));
        } else {
            console.log('❌ Tor status check failed:', await response.text());
        }
    } catch (error) {
        console.log('❌ Tor test failed:', error.message);
    }

    // Test 4: Service Status Overview
    console.log('\n📊 Testing Service Status Overview...\n');
    try {
        const response = await fetch('http://localhost:3001/api/status');
        if (response.ok) {
            const status = await response.json();
            console.log('✅ Service Status Retrieved:');
            console.log('📋 Status:', JSON.stringify(status, null, 2));
        } else {
            console.log('❌ Status check failed:', await response.text());
        }
    } catch (error) {
        console.log('❌ Status test failed:', error.message);
    }
}

runTests().catch(console.error);