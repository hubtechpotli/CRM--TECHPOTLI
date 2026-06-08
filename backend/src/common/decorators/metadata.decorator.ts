import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const SKIP_IP_KEY = 'skipIp';
export const SkipIpCheck = () => SetMetadata(SKIP_IP_KEY, true);

export const SKIP_PASSWORD_CHANGE_KEY = 'skipPasswordChange';
export const SkipPasswordChange = () => SetMetadata(SKIP_PASSWORD_CHANGE_KEY, true);
