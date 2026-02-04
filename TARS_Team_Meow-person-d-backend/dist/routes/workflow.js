"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowRoutes = workflowRoutes;
const engine_1 = require("../workflow/engine");
async function workflowRoutes(server) {
    // POST /workflow/assign
    server.post("/workflow/assign", async (request, reply) => {
        const { evidenceId, validatorAddresses } = request.body;
        if (!evidenceId || !validatorAddresses || !validatorAddresses.length) {
            return reply.status(400).send({ error: "evidenceId and validatorAddresses are required" });
        }
        try {
            await (0, engine_1.assignValidators)(evidenceId, validatorAddresses);
            return { status: "success", message: "Validators assigned" };
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
    // POST /workflow/finalize
    server.post("/workflow/finalize", async (request, reply) => {
        const { evidenceId } = request.body;
        if (!evidenceId) {
            return reply.status(400).send({ error: "evidenceId is required" });
        }
        try {
            await (0, engine_1.evaluateConsensus)(evidenceId);
            return { status: "success", message: "Consensus evaluated" };
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
