import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    return await this.prisma.user.create({
      data: createUserDto,
    });
  }

  async findAll(): Promise<User[]> {
    return await this.prisma.user.findMany({
      include: {
        subscriptions: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        subscriptions: true,
        payments: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByTikTokUsername(
    tiktokUsername: string,
    creatorId?: string | null,
  ): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: {
        tiktokUsername,
        ...(creatorId ? { creatorId } : {}),
      },
      include: {
        subscriptions: true,
        payments: true,
      },
    });
  }

  async findByMpesaMobile(mpesaMobile: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: { mpesaMobile },
      include: {
        subscriptions: true,
        payments: true,
      },
    });
  }

  /** Match whether the DB stored 254… or 07…. */
  async findByMpesaMobileEitherForm(msisdn: string): Promise<User | null> {
    const trimmed = msisdn.trim();
    const as254 = trimmed.startsWith('254')
      ? trimmed
      : trimmed.startsWith('0')
        ? `254${trimmed.slice(1)}`
        : `254${trimmed}`;
    const as0 = `0${as254.slice(3)}`;
    return await this.prisma.user.findFirst({
      where: { OR: [{ mpesaMobile: as254 }, { mpesaMobile: as0 }] },
    });
  }

  async update(id: string, updateData: Prisma.UserUpdateInput): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }
}
