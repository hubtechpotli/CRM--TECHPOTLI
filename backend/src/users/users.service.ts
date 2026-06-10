import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RedisService } from '../redis/redis.service';
import { SessionService } from '../redis/session.service';

const REFRESH_TTL = 7 * 24 * 60 * 60;

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  department: true,
  designation: true,
  isActive: true,
  allowRemoteAccess: true,
  allowedIPs: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private sessions: SessionService,
  ) {}

  findAssignees() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  findAll(role?: UserRole) {
    return this.prisma.user.findMany({
      where: role ? { role } : {},
      select: userSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        twoFactorEnabled: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private assertCanAssignRole(actorRole: UserRole, targetRole: UserRole) {
    if (actorRole === UserRole.SUPER_ADMIN) return;
    if (actorRole === UserRole.ADMIN && targetRole === UserRole.EMPLOYEE) return;
    throw new ForbiddenException('You cannot create or assign this role');
  }

  async update(id: string, data: UpdateUserDto, actorRole?: UserRole) {
    if (data.role && actorRole) {
      this.assertCanAssignRole(actorRole, data.role);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  async create(data: CreateUserDto, actorRole: UserRole) {
    this.assertCanAssignRole(actorRole, data.role);

    const email = data.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hash = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        name: data.name.trim(),
        role: data.role,
        phone: data.phone?.trim() || null,
        department: data.department?.trim() || null,
        designation: data.designation?.trim() || null,
      },
      select: userSelect,
    });
  }

  async resetPassword(actorId: string, targetId: string, dto: ResetPasswordDto) {
    if (actorId === targetId) {
      throw new BadRequestException('Use Profile to change your own password');
    }
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('User not found');

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: targetId },
      data: { passwordHash: hash, mustChangePassword: true },
    });

    const sessions = await this.prisma.userSession.findMany({ where: { userId: targetId } });
    for (const s of sessions) {
      await this.redis.set(`refresh:revoked:${s.refreshTokenLookup}`, targetId, REFRESH_TTL);
    }
    await this.prisma.userSession.deleteMany({ where: { userId: targetId } });
    await this.sessions.revokeAllUserSessions(targetId);

    return { success: true };
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.SUPER_ADMIN) {
      const activeSuperAdmins = await this.prisma.user.count({
        where: { role: UserRole.SUPER_ADMIN, isActive: true },
      });
      if (activeSuperAdmins <= 1) {
        throw new BadRequestException('Cannot delete the last active super admin');
      }
    }

    try {
      await this.prisma.user.delete({ where: { id } });
      return { success: true, hardDeleted: true };
    } catch {
      await this.prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          email: `deleted.${id}.${user.email}`,
        },
      });
      return { success: true, hardDeleted: false, deactivated: true };
    }
  }
}
