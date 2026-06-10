import { PaymentMethod, PaymentStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  customerId: string;

  @IsNumber()
  @Min(0)
  paidAmount: number;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bookingAmount?: number;

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
  @IsDateString()
  dueDate?: string;
}
