import { ethers } from "ethers";
import prisma from "../lib/prisma";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.ALCHEMY_RPC;
const CONTRACT_ADDRESS = process.env.CUSTODY_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

const ABI = [
    "event CustodyChanged(string evidenceId, address indexed actor, string nextState)"
];

/**
 * Starts listening to blockchain events for the custody contract.
 */
export async function startIndexer() {
    if (!RPC_URL) {
        console.warn("ALCHEMY_RPC not provided. Skipping indexer startup.");
        return;
    }

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

        console.log(`Starting Custody Indexer at ${CONTRACT_ADDRESS}...`);

        contract.on("CustodyChanged", async (evidenceId: string, actor: string, nextState: string, event: any) => {
            console.log(`[Blockchain Event] Evidence: ${evidenceId}, Actor: ${actor}, State: ${nextState}`);

            try {
                await prisma.custodyEvent.create({
                    data: {
                        evidenceId,
                        eventType: `BLOCKCHAIN_${nextState.toUpperCase()}`,
                        actorAddress: actor,
                        blockchainTxHash: event.transactionHash,
                        timestamp: new Date()
                    }
                });
            } catch (dbError) {
                console.error("Failed to persist blockchain event to database:", dbError);
            }
        });

    } catch (error) {
        console.error("Failed to initialize indexer:", error);
    }
}
