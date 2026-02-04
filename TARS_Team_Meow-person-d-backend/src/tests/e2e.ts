import { ethers } from "ethers";
import * as crypto from "node:crypto";
import { CryptoService } from "../crypto";

const BASE_URL = "http://localhost:3000";

async function runE2E() {
    console.log("--- Starting E2E Test Suite ---");

    try {
        // 1. Setup Identities
        const submitter = ethers.Wallet.createRandom();
        const validator = ethers.Wallet.createRandom();
        const recipient = ethers.Wallet.createRandom();

        // Initialize sodium for key generation
        const sodium = require("libsodium-wrappers");
        await sodium.ready;
        const { publicKey, privateKey } = sodium.crypto_box_keypair();

        console.log(`Submitter: ${submitter.address}`);
        console.log(`Validator: ${validator.address}`);

        // 2. Submit Evidence
        console.log("\n1. Submitting Evidence...");
        const content = Buffer.from("Secret Evidence Content " + Date.now());
        const payload = {
            content: content.toString("base64"),
            fileName: "test_evidence.txt",
            recipientPublicKeys: [Buffer.from(publicKey).toString("base64")],
            validatorAddresses: [validator.address]
        };

        const submissionRes = await fetch(`${BASE_URL}/evidence/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!submissionRes.ok) throw new Error(`Submission failed: ${await submissionRes.text()}`);
        const { evidenceId, ipfsCid } = await submissionRes.json();
        console.log(`✅ Evidence Submitted! ID: ${evidenceId}, IPFS: ${ipfsCid}`);

        // 3. Validator Authentication (Nonce Flow)
        console.log("\n2. Validator Authentication...");
        const nonceRes = await fetch(`${BASE_URL}/auth/nonce`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: validator.address })
        });
        const { nonce } = await nonceRes.json();
        console.log(`Nonce received: ${nonce}`);

        const signature = await validator.signMessage(nonce);
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: validator.address, signature })
        });
        const { token } = await loginRes.json();
        console.log(`✅ Success! Validator logged in. JWT: ${token.substring(0, 20)}...`);

        // 4. Submit Vote
        console.log("\n3. Submitting Validator Vote...");
        const votePayload = {
            evidenceId,
            verdict: "VALID",
            signature: await validator.signMessage(`Verify evidence ${evidenceId}: VALID`)
        };

        const voteRes = await fetch(`${BASE_URL}/validator/vote`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(votePayload)
        });

        if (!voteRes.ok) throw new Error(`Vote failed: ${await voteRes.text()}`);
        console.log("✅ Vote submitted successfully!");

        // 5. Check Consensus Status
        console.log("\n4. Checking Evidence Status...");
        const statusRes = await fetch(`${BASE_URL}/validator/evidence/${evidenceId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const evidenceData = await statusRes.json();
        console.log(`Evidence Status: ${evidenceData.status}`);

        console.log("\n--- E2E Test Suite Completed Successfully ---");
        process.exit(0);

    } catch (error: any) {
        console.error("\n❌ E2E Test Failed!");
        console.error(error.message);
        process.exit(1);
    }
}

// Check if server is up first
async function checkServer() {
    try {
        const res = await fetch(`${BASE_URL}/ping`);
        return res.ok;
    } catch {
        return false;
    }
}

async function main() {
    console.log("Waiting for server to be ready...");
    let retries = 5;
    while (retries > 0) {
        if (await checkServer()) break;
        console.log("Server not ready, retrying in 2s...");
        await new Promise(r => setTimeout(r, 2000));
        retries--;
    }

    if (retries === 0) {
        console.error("Server failed to start in time.");
        process.exit(1);
    }

    await runE2E();
}

main();
