import prisma from "../lib/prisma";
import { EvidenceStatus } from "@prisma/client";

/**
 * Assigns validators to a piece of evidence.
 * For now, this is a placeholder that assigns specific addresses or handles logic.
 */
export async function assignValidators(evidenceId: string, validatorAddresses: string[]) {
    const data = validatorAddresses.map(address => ({
        evidenceId,
        walletAddress: address
    }));

    await prisma.validatorAssignment.createMany({
        data,
        skipDuplicates: true
    });

    await prisma.evidence.update({
        where: { id: evidenceId },
        data: { status: "ASSIGNED" }
    });

    // Emit custody event
    await prisma.custodyEvent.create({
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
export async function evaluateConsensus(evidenceId: string) {
    const evidence = await prisma.evidence.findUnique({
        where: { id: evidenceId },
        include: { votes: true }
    });

    if (!evidence) return;

    const validVotes = evidence.votes.filter(v => v.verdict === "VALID").length;
    const invalidVotes = evidence.votes.filter(v => v.verdict === "INVALID").length;
    const totalVotes = validVotes + invalidVotes;

    // Simple threshold logic: 2 votes for a 3-validator pool
    if (validVotes >= 2) {
        await transitionEvidenceStatus(evidenceId, "VERIFIED");
    } else if (invalidVotes >= 2) {
        await transitionEvidenceStatus(evidenceId, "REJECTED");
    } else if (totalVotes > 0) {
        await transitionEvidenceStatus(evidenceId, "UNDER_REVIEW");
    }
}

async function transitionEvidenceStatus(evidenceId: string, status: EvidenceStatus) {
    await prisma.evidence.update({
        where: { id: evidenceId },
        data: { status }
    });

    await prisma.custodyEvent.create({
        data: {
            evidenceId,
            eventType: `STATE_TRANSITION_${status}`,
            actorAddress: "SYSTEM",
            timestamp: new Date()
        }
    });
}
