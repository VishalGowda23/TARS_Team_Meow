"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const wallet_1 = require("../auth/wallet");
async function authRoutes(server) {
    // POST /auth/nonce
    server.post("/auth/nonce", async (request, reply) => {
        const { walletAddress } = request.body;
        if (!walletAddress) {
            return reply.status(400).send({ error: "walletAddress is required" });
        }
        const nonce = await (0, wallet_1.generateNonce)(walletAddress);
        return { nonce };
    });
    // POST /auth/login
    server.post("/auth/login", async (request, reply) => {
        const { walletAddress, signature } = request.body;
        if (!walletAddress || !signature) {
            return reply.status(400).send({ error: "walletAddress and signature are required" });
        }
        try {
            const token = await (0, wallet_1.verifySignatureAndLogin)(walletAddress, signature);
            if (token) {
                return { token };
            }
            else {
                return reply.status(401).send({ error: "Invalid signature" });
            }
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
