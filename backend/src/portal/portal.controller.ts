import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PortalService } from './portal.service';
import { Public, SkipIpCheck } from '../common/decorators/metadata.decorator';

@Controller('portal')
export class PortalController {
  constructor(private portal: PortalService) {}

  @Public()
  @SkipIpCheck()
  @Get(':token')
  getPortal(@Param('token') token: string) {
    return this.portal.getByToken(token);
  }

  @Public()
  @SkipIpCheck()
  @Get(':token/tickets')
  listTickets(@Param('token') token: string) {
    return this.portal.listTickets(token);
  }

  @Public()
  @SkipIpCheck()
  @Post(':token/tickets')
  createTicket(@Param('token') token: string, @Body() body: { subject: string; description: string }) {
    return this.portal.createTicket(token, body.subject, body.description);
  }
}
