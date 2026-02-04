import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { assignValidators, evaluateConsensus } from "../workflow/engine";

export async function workflowRoutes(server: FastifyInstance) {

    // POST /workflow/assign
    server.post("/workflow/assign", async (request: FastifyRequest, reply: FastifyReply) => {
        const { evidenceId, validatorAddresses } = request.body as {
            evidenceId: string,
            validatorAddresses: string[]
        };

        if (!evidenceId || !validatorAddresses || !validatorAddresses.length) {
            return reply.status(400).send({ error: "evidenceId and validatorAddresses are required" });
        }

        try {
            await assignValidators(evidenceId, validatorAddresses);
            return { status: "success", message: "Validators assigned" };
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });

    // POST /workflow/finalize
    server.post("/workflow/finalize", async (request: FastifyRequest, reply: FastifyReply) => {
        const { evidenceId } = request.body as { evidenceId: string };

        if (!evidenceId) {
            return reply.status(400).send({ error: "evidenceId is required" });
        }

        try {
            await evaluateConsensus(evidenceId);
            return { status: "success", message: "Consensus evaluated" };
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
