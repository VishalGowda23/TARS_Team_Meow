import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import prisma from "../lib/prisma";
import { generateAuditPDF } from "../reports/generator";

export async function auditRoutes(server: FastifyInstance) {

    // GET /audit/:evidenceId/pdf
    server.get("/audit/:evidenceId/pdf", async (request: FastifyRequest, reply: FastifyReply) => {
        const { evidenceId } = request.params as { evidenceId: string };

        try {
            const evidence = await prisma.evidence.findUnique({
                where: { id: evidenceId },
                include: {
                    custodyEvents: { orderBy: { timestamp: 'asc' } },
                    votes: true
                }
            });

            if (!evidence) {
                return reply.status(404).send({ error: "Evidence not found" });
            }

            const pdfBuffer = await generateAuditPDF(evidence);

            reply
                .type("application/pdf")
                .header("Content-Disposition", `attachment; filename=audit_report_${evidenceId}.pdf`)
                .send(pdfBuffer);

        } catch (error: any) {
            server.log.error(error);
            return reply.status(500).send({ error: "Internal server error during PDF generation" });
        }
    });
}
