import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Keep Prisma well below Supabase/session-pooler connection limits. */
function withPrismaPoolParams(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '5');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '30');
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: { url: withPrismaPoolParams(process.env.DATABASE_URL || '') },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    await this.ensureCreatorMediaColumns();
  }

  /** Image slots added after some DBs were created without Prisma migrate. */
  private async ensureCreatorMediaColumns() {
    await this.$executeRawUnsafe(
      `ALTER TABLE "creators" ADD COLUMN IF NOT EXISTS "thumbnail_url" VARCHAR(800)`,
    );
    await this.$executeRawUnsafe(
      `ALTER TABLE "creators" ADD COLUMN IF NOT EXISTS "cover_url" VARCHAR(800)`,
    );
    await this.$executeRawUnsafe(
      `ALTER TABLE "creators" ALTER COLUMN "avatar_url" TYPE VARCHAR(800)`,
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
