import { CustomerStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

/** Partial customer patch — status is validated; other fields pass through via controller mapping. */
export class UpdateCustomerStatusDto {
  @IsEnum(CustomerStatus)
  status!: CustomerStatus;
}
