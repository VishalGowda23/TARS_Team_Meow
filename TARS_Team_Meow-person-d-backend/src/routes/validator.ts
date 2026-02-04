import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyToken } from "../auth/wallet";
import prisma from "../lib/prisma";

export async function validatorRoutes(server: FastifyInstance) {

    // Add a hook to verify JWT for all routes in this plugin
    server.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return reply.status(401).send({ error: "Missing or invalid token" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = await verifyToken(token);

        if (!decoded) {
            return reply.status(401).send({ error: "Invalid token" });
        }

        // Attach user to request
        (request as any).user = decoded;
    });

    // GET /validator/evidence/:id
    server.get("/validator/evidence/:id", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const evidence = await prisma.evidence.findUnique({
            where: { id },
            include: { assignments: true }
        });

        if (!evidence) {
            return reply.status(404).send({ error: "Evidence not found" });
        }

        return evidence;
    });

    // POST /validator/vote
    server.post("/validator/vote", async (request: FastifyRequest, reply: FastifyReply) => {
        const { evidenceId, verdict, signature } = request.body as {
            evidenceId: string,
            verdict: string,
            signature: string
        };
        const walletAddress = (request as any).user.walletAddress;

        try {
            const vote = await prisma.validatorVote.upsert({
                where: {
                    evidenceId_walletAddress: { evidenceId, walletAddress }
                },
                update: { verdict, signature, votedAt: new Date() },
                create: { evidenceId, walletAddress, verdict, signature }
            });

            // Emit custody event
            await prisma.custodyEvent.create({
                data: {
                    evidenceId,
                    eventType: "VOTE",
                    actorAddress: walletAddress,
                    timestamp: new Date()
                }
            });

            return vote;
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // GET /validator/download/:id
    server.get("/validator/download/:id", async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const walletAddress = (request as any).user.walletAddress;

        // Check if assigned
        const assignment = await prisma.validatorAssignment.findUnique({
            where: {
                evidenceId_walletAddress: { evidenceId: id, walletAddress }
            }
        });

        if (!assignment) {
            return reply.status(403).send({ error: "You are not assigned to this evidence" });
        }

        const evidence = await prisma.evidence.findUnique({ where: { id } });
        const encryptedKey = await prisma.encryptedKey.findUnique({
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
