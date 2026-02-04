import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { generateNonce, verifySignatureAndLogin } from "../auth/wallet";

export async function authRoutes(server: FastifyInstance) {

    // POST /auth/nonce
    server.post("/auth/nonce", async (request: FastifyRequest, reply: FastifyReply) => {
        const { walletAddress } = request.body as { walletAddress: string };
        if (!walletAddress) {
            return reply.status(400).send({ error: "walletAddress is required" });
        }
        const nonce = await generateNonce(walletAddress);
        return { nonce };
    });

    // POST /auth/login
    server.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
        const { walletAddress, signature } = request.body as { walletAddress: string, signature: string };
        if (!walletAddress || !signature) {
            return reply.status(400).send({ error: "walletAddress and signature are required" });
        }

        try {
            const token = await verifySignatureAndLogin(walletAddress, signature);
            if (token) {
                return { token };
            } else {
                return reply.status(401).send({ error: "Invalid signature" });
            }
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
