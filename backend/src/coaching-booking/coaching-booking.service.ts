import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CoachingBookingService as ServiceEnum } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveCoachingAccountReviewKes } from '../common/utils/coaching-booking-price';
import { CreateCoachingBookingDto } from './dto/create-coaching-booking.dto';

@Injectable()
export class CoachingBookingService {
  private readonly logger = new Logger(CoachingBookingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Public: /book page shows current checkout amount. */
  async getAccountReviewPricing(
    creatorSlug?: string,
  ): Promise<{ accountReviewKes: number }> {
    let creatorId: string | null = null;
    const slug = creatorSlug?.trim().toLowerCase();
    if (slug) {
      const c = await this.prisma.creator.findFirst({
        where: {
          slug: { equals: slug, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
      if (c) creatorId = c.id;
    }
    const accountReviewKes = await resolveCoachingAccountReviewKes(
      this.prisma,
      creatorId,
    );
    return { accountReviewKes };
  }

  private normalizeService(raw: string): ServiceEnum {
    const key = raw.replace(/-/g, '_').toUpperCase();
    if (key === 'ACCOUNT_REVIEW') return ServiceEnum.ACCOUNT_REVIEW;
    if (key === 'RANK_PUSH') return ServiceEnum.RANK_PUSH;
    if (key === 'BOTH') return ServiceEnum.BOTH;
    throw new BadRequestException('Invalid service type');
  }

  async create(dto: CreateCoachingBookingDto) {
    const slug = dto.creatorSlug?.trim().toLowerCase();
    if (slug) {
      const creator = await this.prisma.creator.findFirst({
        where: {
          slug: { equals: slug, mode: 'insensitive' },
          isActive: true,
          onboardingComplete: true,
          supportEnabled: true,
        },
        select: { id: true },
      });
      if (!creator) {
        throw new BadRequestException('Creator not found or unavailable');
      }
    }
    const service = this.normalizeService(dto.service);
    if (
      service === ServiceEnum.ACCOUNT_REVIEW ||
      service === ServiceEnum.BOTH
    ) {
      throw new BadRequestException(
        'Account review requires a KES 100 M-Pesa payment — complete the paid booking on this page.',
      );
    }
    const row = await this.prisma.coachingBooking.create({
      data: {
        service,
        name: dto.name.trim(),
        contact: dto.contact.trim(),
        availability: dto.availability?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
    this.logger.log(`Coaching booking stored id=${row.id} service=${row.service}`);
    return row;
  }
}
