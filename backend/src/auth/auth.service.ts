import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { Admin } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(username: string, password: string): Promise<Admin | null> {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return null;
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    return admin;
  }

  async login(loginDto: LoginDto) {
    const admin = await this.validateAdmin(loginDto.username, loginDto.password);

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Admin ${admin.username} logged in successfully`);

    return {
      accessToken,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    };
  }

  async validateAdminById(id: string): Promise<Admin | null> {
    return await this.prisma.admin.findUnique({
      where: { id },
    });
  }

  async createAdmin(username: string, email: string, password: string, role: 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN' = 'ADMIN') {
    const hashedPassword = await bcrypt.hash(password, 10);

    return await this.prisma.admin.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role,
      },
    });
  }

  async changePassword(adminId: string, oldPassword: string, newPassword: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, admin.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedNewPassword },
    });

    this.logger.log(`Admin ${admin.username} changed password`);

    return { message: 'Password changed successfully' };
  }
}
