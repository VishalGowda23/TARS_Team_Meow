"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignValidators = assignValidators;
exports.evaluateConsensus = evaluateConsensus;
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * Assigns validators to a piece of evidence.
 * For now, this is a placeholder that assigns specific addresses or handles logic.
 */
async function assignValidators(evidenceId, validatorAddresses) {
    const data = validatorAddresses.map(address => ({
        evidenceId,
        walletAddress: address
    }));
    await prisma_1.default.validatorAssignment.createMany({
        data,
        skipDuplicates: true
    });
    await prisma_1.default.evidence.update({
        where: { id: evidenceId },
        data: { status: "ASSIGNED" }
    });
    // Emit custody event
    await prisma_1.default.custodyEvent.create({
        data: {
            evidenceId,
            eventType: "ASSIGNMENT",
            actorAddress: "SYSTEM",
            timestamp: new Date()
        }
    });
}
/**
 * Checks for consensus and transitions the state of the evidence.
 * Threshold: 2/3 majorities for now.
 */
async function evaluateConsensus(evidenceId) {
    const evidence = await prisma_1.default.evidence.findUnique({
        where: { id: evidenceId },
        include: { votes: true }
    });
    if (!evidence)
        return;
    const validVotes = evidence.votes.filter(v => v.verdict === "VALID").length;
    const invalidVotes = evidence.votes.filter(v => v.verdict === "INVALID").length;
    const totalVotes = validVotes + invalidVotes;
    // Simple threshold logic: 2 votes for a 3-validator pool
    if (validVotes >= 2) {
        await transitionEvidenceStatus(evidenceId, "VERIFIED");
    }
    else if (invalidVotes >= 2) {
        await transitionEvidenceStatus(evidenceId, "REJECTED");
    }
    else if (totalVotes > 0) {
        await transitionEvidenceStatus(evidenceId, "UNDER_REVIEW");
    }
}
async function transitionEvidenceStatus(evidenceId, status) {
    await prisma_1.default.evidence.update({
        where: { id: evidenceId },
        data: { status }
    });
    await prisma_1.default.custodyEvent.create({
        data: {
            evidenceId,
            eventType: `STATE_TRANSITION_${status}`,
            actorAddress: "SYSTEM",
            timestamp: new Date()
        }
    });
}
