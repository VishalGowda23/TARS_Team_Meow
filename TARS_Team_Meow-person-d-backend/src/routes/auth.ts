import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { generateNonce, verifySignatureAndLogin } from "../auth/wallet";
import { AuthService } from "../auth/userAuth";

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'AGENT' | 'VALIDATOR' | 'HIGHER_AUTHORITY' | 'ADMIN';
  walletAddress?: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

export async function authRoutes(server: FastifyInstance) {

    // POST /auth/register - Register new user
    server.post("/auth/register", async (request: FastifyRequest<{Body: RegisterRequest}>, reply: FastifyReply) => {
        try {
            const { email, password, firstName, lastName, role, walletAddress } = request.body;
            
            if (!email || !password) {
                return reply.status(400).send({ error: "Email and password are required" });
            }

            const tokens = await AuthService.registerUser({
                email,
                password,
                firstName,
                lastName,
                role,
                walletAddress
            });

            return reply.send({
                success: true,
                ...tokens
            });
        } catch (error: any) {
            return reply.status(400).send({ 
                error: error.message || "Registration failed" 
            });
        }
    });

    // POST /auth/login - Email/password login
    server.post("/auth/login", async (request: FastifyRequest<{Body: LoginRequest}>, reply: FastifyReply) => {
        try {
            const { email, password } = request.body;
            
            if (!email || !password) {
                return reply.status(400).send({ error: "Email and password are required" });
            }

            const ipAddress = request.ip;
            const userAgent = request.headers['user-agent'];

            const tokens = await AuthService.loginUser(
                { email, password },
                ipAddress,
                userAgent
            );

            return reply.send({
                success: true,
                ...tokens
            });
        } catch (error: any) {
            return reply.status(401).send({ 
                error: error.message || "Login failed" 
            });
        }
    });

    // POST /auth/refresh - Refresh access token
    server.post("/auth/refresh", async (request: FastifyRequest<{Body: RefreshTokenRequest}>, reply: FastifyReply) => {
        try {
            const { refreshToken } = request.body;
            
            if (!refreshToken) {
                return reply.status(400).send({ error: "Refresh token is required" });
            }

            const tokens = await AuthService.refreshToken(refreshToken);
            
            if (!tokens) {
                return reply.status(401).send({ error: "Invalid or expired refresh token" });
            }

            return reply.send({
                success: true,
                ...tokens
            });
        } catch (error: any) {
            return reply.status(401).send({ 
                error: error.message || "Token refresh failed" 
            });
        }
    });

    // POST /auth/logout - Logout current session
    server.post("/auth/logout", async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const token = request.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return reply.status(400).send({ error: "Authorization token is required" });
            }

            const success = await AuthService.logoutUser(token);
            
            return reply.send({ success });
        } catch (error: any) {
            return reply.status(400).send({ 
                error: error.message || "Logout failed" 
            });
        }
    });

    // GET /auth/me - Get current user profile
    server.get("/auth/me", async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const token = request.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return reply.status(401).send({ error: "Authorization token is required" });
            }

            const user = await AuthService.verifyToken(token);
            
            if (!user) {
                return reply.status(401).send({ error: "Invalid or expired token" });
            }

            const { passwordHash, ...userWithoutPassword } = user;

            return reply.send({
                success: true,
                user: userWithoutPassword
            });
        } catch (error: any) {
            return reply.status(401).send({ 
                error: error.message || "Authentication failed" 
            });
        }
    });

    // Wallet authentication routes (existing)

    // POST /auth/nonce
    server.post("/auth/nonce", async (request: FastifyRequest, reply: FastifyReply) => {
        const { walletAddress } = request.body as { walletAddress: string };
        if (!walletAddress) {
            return reply.status(400).send({ error: "walletAddress is required" });
        }
        const nonce = await generateNonce(walletAddress);
        return { nonce };
    });

    // POST /auth/wallet-login - Wallet signature login
    server.post("/auth/wallet-login", async (request: FastifyRequest, reply: FastifyReply) => {
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
