import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { grantDisclosure, validateToken } from "../disclosure/service";

export async function disclosureRoutes(server: FastifyInstance) {

    // POST /disclosure/grant
    server.post("/disclosure/grant", async (request: FastifyRequest, reply: FastifyReply) => {
        const { evidenceId, recipientEmail, ttlSeconds } = request.body as {
            evidenceId: string,
            recipientEmail: string,
            ttlSeconds?: number
        };

        if (!evidenceId || !recipientEmail) {
            return reply.status(400).send({ error: "evidenceId and recipientEmail are required" });
        }

        try {
            const token = await grantDisclosure(evidenceId, recipientEmail, ttlSeconds);
            return { token };
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // GET /disclosure/key/:token
    server.get("/disclosure/key/:token", async (request: FastifyRequest, reply: FastifyReply) => {
        const { token } = request.params as { token: string };

        try {
            const evidence = await validateToken(token);
            if (!evidence) {
                return reply.status(401).send({ error: "Invalid or expired token" });
            }
            return evidence;
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
