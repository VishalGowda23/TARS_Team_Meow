"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disclosureRoutes = disclosureRoutes;
const service_1 = require("../disclosure/service");
async function disclosureRoutes(server) {
    // POST /disclosure/grant
    server.post("/disclosure/grant", async (request, reply) => {
        const { evidenceId, recipientEmail, ttlSeconds } = request.body;
        if (!evidenceId || !recipientEmail) {
            return reply.status(400).send({ error: "evidenceId and recipientEmail are required" });
        }
        try {
            const token = await (0, service_1.grantDisclosure)(evidenceId, recipientEmail, ttlSeconds);
            return { token };
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
    // GET /disclosure/key/:token
    server.get("/disclosure/key/:token", async (request, reply) => {
        const { token } = request.params;
        try {
            const evidence = await (0, service_1.validateToken)(token);
            if (!evidence) {
                return reply.status(401).send({ error: "Invalid or expired token" });
            }
            return evidence;
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
