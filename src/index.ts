import fastify from "fastify";
import dotenv from "dotenv";

dotenv.config();

const server = fastify({
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

import { authRoutes } from "./routes/auth";
import { validatorRoutes } from "./routes/validator";
import { workflowRoutes } from "./routes/workflow";
import { disclosureRoutes } from "./routes/disclosure";
import { auditRoutes } from "./routes/audit";
import { submissionRoutes } from "./routes/submission";
import { integrationRoutes } from "./routes/integration";

server.register(authRoutes);
server.register(validatorRoutes);
server.register(workflowRoutes);
server.register(disclosureRoutes);
server.register(auditRoutes);
server.register(submissionRoutes);
server.register(integrationRoutes);

import { startIndexer } from "./indexer/custody";

import prisma, { connectWithRetry } from "./lib/prisma";

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});

const start = async () => {
    try {
        console.log("Checking DB connection...");
        const dbConnected = await connectWithRetry();
        if (!dbConnected) {
            console.warn("⚠️ Starting server without database connection");
        }

        const port = parseInt(process.env.PORT || "3000");
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening at http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
