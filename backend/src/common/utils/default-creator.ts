import { PrismaService } from '../../prisma/prisma.service';

/**
 * Creator used for platform-wide flows that are not yet scoped to a profile (e.g. generic shoutout URL).
 * Set DEFAULT_CREATOR_SLUG to a public slug; otherwise the oldest creator row is used.
 */
export async function resolveDefaultCreatorId(
  prisma: PrismaService,
): Promise<string | null> {
  const slug = process.env.DEFAULT_CREATOR_SLUG?.trim().toLowerCase();
  if (slug) {
    const bySlug = await prisma.creator.findUnique({ where: { slug } });
    if (bySlug) return bySlug.id;
  }
  const first = await prisma.creator.findFirst({
    orderBy: { createdAt: 'asc' },
  });
  return first?.id ?? null;
}
