import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure DATABASE_URL is set
// Append connection pool params for Neon serverless to avoid idle connection closures
const baseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zKX2utWUvy4Y@ep-rough-bonus-a1rixpjo-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const databaseUrl = baseUrl.includes('connection_limit')
  ? baseUrl
  : `${baseUrl}&connection_limit=5&connect_timeout=15&pool_timeout=15`

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
