import { PrismaClient } from "@prisma/client"

// PrismaClient adalah singleton untuk mencegah banyak instance selama hot reloading
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
