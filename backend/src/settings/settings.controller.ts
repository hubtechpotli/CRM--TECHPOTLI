import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { SettingsService } from './settings.service';
import { Roles } from '../common/decorators/metadata.decorator';
import { RolesGuard } from '../common/guards/auth.guards';

@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  getSettings() {
    return this.settings.getSettings();
  }

  @Patch()
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.settings.updateSettings(body);
  }

  @Get('allowed-ips')
  listAllowedIps() {
    return this.settings.listAllowedIps();
  }

  @Post('allowed-ips')
  createAllowedIp(@Body() body: Record<string, unknown>) {
    return this.settings.createAllowedIp(body as Parameters<SettingsService['createAllowedIp']>[0]);
  }

  @Patch('allowed-ips/:id')
  updateAllowedIp(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.settings.updateAllowedIp(id, body);
  }

  @Delete('allowed-ips/:id')
  removeAllowedIp(@Param('id') id: string) {
    return this.settings.removeAllowedIp(id);
  }
}
