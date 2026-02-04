"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const server = (0, fastify_1.default)({
    logger: {
        redact: ["req.headers.authorization", "req.body.signature", "req.body.privateKey"],
        transport: {
            target: 'pino-pretty'
        }
    }
});
server.get("/ping", async () => {
    return { status: "ok", message: "pong" };
});
const auth_1 = require("./routes/auth");
const validator_1 = require("./routes/validator");
const workflow_1 = require("./routes/workflow");
const disclosure_1 = require("./routes/disclosure");
const audit_1 = require("./routes/audit");
const submission_1 = require("./routes/submission");
const integration_1 = require("./routes/integration");
server.register(auth_1.authRoutes);
server.register(validator_1.validatorRoutes);
server.register(workflow_1.workflowRoutes);
server.register(disclosure_1.disclosureRoutes);
server.register(audit_1.auditRoutes);
server.register(submission_1.submissionRoutes);
server.register(integration_1.integrationRoutes);
const prisma_1 = require("./lib/prisma");
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});
const start = async () => {
    try {
        console.log("Checking DB connection...");
        const dbConnected = await (0, prisma_1.connectWithRetry)();
        if (!dbConnected) {
            console.warn("⚠️ Starting server without database connection");
        }
        const port = parseInt(process.env.PORT || "3000");
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening at http://localhost:${port}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
