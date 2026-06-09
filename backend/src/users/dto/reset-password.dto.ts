import { IsString, MinLength, Matches } from 'class-validator';

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).+$/;

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_PATTERN, {
    message: 'Password must include uppercase, number, and special character',
  })
  newPassword: string;

  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
