import { PaymentMethod, PaymentStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  proofS3Key?: string;

  @IsOptional()
  @IsString()
  proofFilename?: string;

  @IsOptional()
  @IsString()
  proofMimeType?: string;

  @IsOptional()
  @IsDateString()
  collectedAt?: string;

  @IsOptional()
  @IsBoolean()
  verify?: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  invoiceId?: string;
}
