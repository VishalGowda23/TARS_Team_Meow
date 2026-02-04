"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRoutes = auditRoutes;
const prisma_1 = __importDefault(require("../lib/prisma"));
const generator_1 = require("../reports/generator");
async function auditRoutes(server) {
    // GET /audit/:evidenceId/pdf
    server.get("/audit/:evidenceId/pdf", async (request, reply) => {
        const { evidenceId } = request.params;
        try {
            const evidence = await prisma_1.default.evidence.findUnique({
                where: { id: evidenceId },
                include: {
                    custodyEvents: { orderBy: { timestamp: 'asc' } },
                    votes: true
                }
            });
            if (!evidence) {
                return reply.status(404).send({ error: "Evidence not found" });
            }
            const pdfBuffer = await (0, generator_1.generateAuditPDF)(evidence);
            reply
                .type("application/pdf")
                .header("Content-Disposition", `attachment; filename=audit_report_${evidenceId}.pdf`)
                .send(pdfBuffer);
        }
        catch (error) {
            server.log.error(error);
            return reply.status(500).send({ error: "Internal server error during PDF generation" });
        }
    });
}
