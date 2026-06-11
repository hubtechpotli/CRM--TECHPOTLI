import { Body, Controller, Get, Headers, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto, Enroll2faDto, LoginDto, Setup2faDto, Verify2faDto } from './dto/auth.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public, SkipPasswordChange } from '../common/decorators/metadata.decorator';
import { CurrentUser, ClientIp, JwtPayload } from '../common/decorators/user.decorator';
import { clearRefreshCookie, getRefreshCookie, setRefreshCookie } from '../common/utils/cookie.util';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password, ip, userAgent || 'unknown');
    if (result.refreshToken) setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...body } = result;
    return body;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/verify')
  async verify2fa(
    @Body() dto: Verify2faDto,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verify2fa(dto.tempToken, dto.code, ip, userAgent || 'unknown');
    if (result.refreshToken) setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...body } = result;
    return body;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/setup-enroll')
  setup2faEnroll(@Body() dto: Enroll2faDto) {
    return this.auth.setup2faEnroll(dto.setupToken);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/confirm-enroll')
  async confirm2faEnroll(
    @Body() dto: Enroll2faDto & Setup2faDto,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.confirm2faEnroll(dto.setupToken, dto.code, ip, userAgent || 'unknown');
    if (result.refreshToken) setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...body } = result;
    return body;
  }

  @UseGuards(AuthGuard('jwt'))
  @SkipPasswordChange()
  @Post('2fa/setup')
  setup2fa(@CurrentUser() user: JwtPayload) {
    return this.auth.setup2fa(user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @SkipPasswordChange()
  @Post('2fa/confirm')
  confirm2fa(@CurrentUser() user: JwtPayload, @Body() dto: Setup2faDto) {
    return this.auth.confirm2fa(user.sub, dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = getRefreshCookie(req.headers.cookie);
    const result = await this.auth.refresh(token || '', ip, userAgent || 'unknown');
    if (result.refreshToken) setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...body } = result;
    return body;
  }

  @UseGuards(AuthGuard('jwt'))
  @SkipPasswordChange()
  @Post('logout')
  async logout(
    @CurrentUser() user: JwtPayload,
    @Body('sessionId') sessionId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.sub, sessionId || user.sid);
    if (!sessionId || sessionId === user.sid) clearRefreshCookie(res);
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @SkipPasswordChange()
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword);
    clearRefreshCookie(res);
    return { success: true, requiresReLogin: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @SkipPasswordChange()
  @Get('sessions')
  sessions(@CurrentUser() user: JwtPayload) {
    return this.auth.getSessions(user.sub, user.sid);
  }

  @UseGuards(AuthGuard('jwt'))
  @SkipPasswordChange()
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.getProfile(user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @SkipPasswordChange()
  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.sub, dto.name);
  }
}
