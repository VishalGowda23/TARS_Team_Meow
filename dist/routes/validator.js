"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatorRoutes = validatorRoutes;
const wallet_1 = require("../auth/wallet");
const prisma_1 = __importDefault(require("../lib/prisma"));
async function validatorRoutes(server) {
    // Add a hook to verify JWT for all routes in this plugin
    server.addHook("preHandler", async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return reply.status(401).send({ error: "Missing or invalid token" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = await (0, wallet_1.verifyToken)(token);
        if (!decoded) {
            return reply.status(401).send({ error: "Invalid token" });
        }
        // Attach user to request
        request.user = decoded;
    });
    // GET /validator/evidence/:id
    server.get("/validator/evidence/:id", async (request, reply) => {
        const { id } = request.params;
        const evidence = await prisma_1.default.evidence.findUnique({
            where: { id },
            include: { assignments: true }
        });
        if (!evidence) {
            return reply.status(404).send({ error: "Evidence not found" });
        }
        return evidence;
    });
    // POST /validator/vote
    server.post("/validator/vote", async (request, reply) => {
        const { evidenceId, verdict, signature } = request.body;
        const walletAddress = request.user.walletAddress;
        try {
            const vote = await prisma_1.default.validatorVote.upsert({
                where: {
                    evidenceId_walletAddress: { evidenceId, walletAddress }
                },
                update: { verdict, signature, votedAt: new Date() },
                create: { evidenceId, walletAddress, verdict, signature }
            });
            // Emit custody event
            await prisma_1.default.custodyEvent.create({
                data: {
                    evidenceId,
                    eventType: "VOTE",
                    actorAddress: walletAddress,
                    timestamp: new Date()
                }
            });
            return vote;
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
    // GET /validator/download/:id
    server.get("/validator/download/:id", async (request, reply) => {
        const { id } = request.params;
        const walletAddress = request.user.walletAddress;
        // Check if assigned
        const assignment = await prisma_1.default.validatorAssignment.findUnique({
            where: {
                evidenceId_walletAddress: { evidenceId: id, walletAddress }
            }
        });
        if (!assignment) {
            return reply.status(403).send({ error: "You are not assigned to this evidence" });
        }
        const evidence = await prisma_1.default.evidence.findUnique({ where: { id } });
        const encryptedKey = await prisma_1.default.encryptedKey.findUnique({
            where: {
                evidenceId_recipientAddress: { evidenceId: id, recipientAddress: walletAddress }
            }
        });
        return {
            ipfsCid: evidence?.ipfsCid,
            arweaveTx: evidence?.arweaveTx,
            wrappedKey: encryptedKey?.wrappedKey
        };
    });
}
