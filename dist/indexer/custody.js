"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startIndexer = startIndexer;
const ethers_1 = require("ethers");
const prisma_1 = __importDefault(require("../lib/prisma"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const RPC_URL = process.env.ALCHEMY_RPC;
const CONTRACT_ADDRESS = process.env.CUSTODY_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const ABI = [
    "event CustodyChanged(string evidenceId, address indexed actor, string nextState)"
];
/**
 * Starts listening to blockchain events for the custody contract.
 */
async function startIndexer() {
    if (!RPC_URL) {
        console.warn("ALCHEMY_RPC not provided. Skipping indexer startup.");
        return;
    }
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers_1.ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        console.log(`Starting Custody Indexer at ${CONTRACT_ADDRESS}...`);
        contract.on("CustodyChanged", async (evidenceId, actor, nextState, event) => {
            console.log(`[Blockchain Event] Evidence: ${evidenceId}, Actor: ${actor}, State: ${nextState}`);
            try {
                await prisma_1.default.custodyEvent.create({
                    data: {
                        evidenceId,
                        eventType: `BLOCKCHAIN_${nextState.toUpperCase()}`,
                        actorAddress: actor,
                        blockchainTxHash: event.transactionHash,
                        timestamp: new Date()
                    }
                });
            }
            catch (dbError) {
                console.error("Failed to persist blockchain event to database:", dbError);
            }
        });
    }
    catch (error) {
        console.error("Failed to initialize indexer:", error);
    }
}
