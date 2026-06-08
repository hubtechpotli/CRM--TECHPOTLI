import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ComposeEmailDto {
  @IsIn(['lead', 'customer'])
  recipientType: 'lead' | 'customer';

  @IsString()
  @MinLength(1)
  recipientId: string;

  @IsString()
  @MinLength(1)
  purpose: string;
}

export class SendComposedEmailDto {
  @IsIn(['lead', 'customer'])
  recipientType: 'lead' | 'customer';

  @IsString()
  @MinLength(1)
  recipientId: string;

  @IsString()
  @MinLength(1)
  purpose: string;

  @IsEmail()
  to: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(1)
  body: string;
}
