import { PrismaClient, UserRole } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL or DIRECT_URL not found in .env');
  process.exit(1);
}

// Create connection pool
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_USERS = [
  // Agents (whistleblowers)
  { email: 'agent1@tars.io', password: 'password123', role: UserRole.AGENT, firstName: 'Agent', lastName: 'One' },
  { email: 'agent2@tars.io', password: 'password123', role: UserRole.AGENT, firstName: 'Agent', lastName: 'Two' },
  { email: 'agent3@tars.io', password: 'password123', role: UserRole.AGENT, firstName: 'Agent', lastName: 'Three' },
  { email: 'whistleblower@tars.io', password: 'password123', role: UserRole.AGENT, firstName: 'Anonymous', lastName: 'Whistleblower' },
  
  // Validators
  { email: 'validator1@tars.io', password: 'password123', role: UserRole.VALIDATOR, firstName: 'Validator', lastName: 'One' },
  { email: 'validator2@tars.io', password: 'password123', role: UserRole.VALIDATOR, firstName: 'Validator', lastName: 'Two' },
  { email: 'validator3@tars.io', password: 'password123', role: UserRole.VALIDATOR, firstName: 'Validator', lastName: 'Three' },
  
  // Higher Authority
  { email: 'authority@tars.io', password: 'password123', role: UserRole.HIGHER_AUTHORITY, firstName: 'Higher', lastName: 'Authority' },
  
  // Admin
  { email: 'admin@tars.io', password: 'password123', role: UserRole.ADMIN, firstName: 'System', lastName: 'Admin' },
];

async function main() {
  console.log('🌱 Seeding database with demo users...\n');

  for (const user of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      create: {
        email: user.email,
        passwordHash,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: true,
      },
    });

    console.log(`✅ ${user.role.padEnd(16)} | ${user.email.padEnd(25)} | password: ${user.password}`);
  }

  console.log('\n🎉 Database seeded successfully!');
  console.log('\nYou can now login with any of the above credentials.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
