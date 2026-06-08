import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CustomerEmailReason } from '../../mail/templates/customer-notice.template';

const REASONS: CustomerEmailReason[] = ['PAYMENT_PENDING', 'PAYMENT_OVERDUE', 'MAINTENANCE_CLOSURE', 'RENEWAL_DUE'];

export class SendCustomerEmailDto {
  @IsIn(REASONS)
  reason: CustomerEmailReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
