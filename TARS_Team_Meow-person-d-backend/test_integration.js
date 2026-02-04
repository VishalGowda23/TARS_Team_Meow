
const fetch = require('node-fetch'); // Assuming node-fetch or native fetch in Node 25

async function test() {
    try {
        const response = await fetch('http://localhost:3000/api/store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stageId: 'mock-123',
                evidenceHash: 'dummy-hash', // This will trigger a warning but not failure
                encryptionRequired: true
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', data);

        if (response.status === 200 && data.cid) {
            console.log('✅ Integration Test Passed');
        } else {
            console.error('❌ Integration Test Failed');
            process.exit(1);
        }
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

test();
