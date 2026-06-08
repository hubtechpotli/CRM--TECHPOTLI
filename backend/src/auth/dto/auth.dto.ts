import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class Verify2faDto {
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @IsString()
  @MinLength(6)
  code: string;
}

export class Setup2faDto {
  @IsString()
  code: string;
}

export class Enroll2faDto {
  @IsString()
  @IsNotEmpty()
  setupToken: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).+$/, {
    message: 'Password must include uppercase, number, and special character',
  })
  newPassword: string;
}
