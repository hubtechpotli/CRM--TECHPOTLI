import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomerStatus, CustomerWorkItemStatus, UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';
import { PortalService } from '../portal/portal.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/metadata.decorator';
import { RolesGuard } from '../common/guards/auth.guards';
import { SendCustomerEmailDto } from './dto/send-customer-email.dto';
import { CustomerEmailReason } from '../mail/templates/customer-notice.template';

@Controller('customers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CustomersController {
  constructor(
    private customers: CustomersService,
    private portal: PortalService,
  ) {}

  @Get()
  findAll() {
    return this.customers.findAll();
  }

  @Get('directory')
  directory(
    @Query('status') status?: CustomerStatus,
    @Query('state') state?: string,
    @Query('q') q?: string,
    @Query('assignedEmployeeId') assignedEmployeeId?: string,
  ) {
    return this.customers.directory({ status, state, q, assignedEmployeeId });
  }

  @Get('favorites')
  listFavorites(@CurrentUser() user: JwtPayload) {
    return this.customers.listFavorites(user.sub);
  }

  @Get('recently-viewed')
  listRecentlyViewed(@CurrentUser() user: JwtPayload) {
    return this.customers.listRecentlyViewed(user.sub);
  }

  @Get('notify/templates')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  listNotifyTemplates() {
    return this.customers.listNotifyTemplates();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.customers.trackRecentlyViewed(user.sub, id);
    return this.customers.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.customers.create(body as Parameters<CustomersService['create']>[0], user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.customers.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customers.remove(id);
  }

  @Post(':id/favorite')
  toggleFavorite(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.customers.toggleFavorite(user.sub, id);
  }

  @Get(':id/portal')
  getPortalAccess(@Param('id') id: string) {
    return this.portal.getAccessForCustomer(id);
  }

  @Post(':id/portal')
  createPortalLink(@Param('id') id: string) {
    return this.portal.createAccess(id);
  }

  @Patch(':id/portal/revoke')
  revokePortalLink(@Param('id') id: string, @Body() body?: { accessId?: string }) {
    return this.portal.revokeAccess(id, body?.accessId);
  }

  @Patch(':id/portal/regenerate')
  regeneratePortalLink(@Param('id') id: string) {
    return this.portal.regenerateAccess(id);
  }

  @Get(':id/call-logs')
  listCallLogs(@Param('id') id: string) {
    return this.customers.listCallLogs(id);
  }

  @Post(':id/call-logs')
  addCallLog(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() body: { notes: string; followUpDate?: string }) {
    return this.customers.addCallLog(id, user.sub, { ...body, followUpDate: body.followUpDate ? new Date(body.followUpDate) : undefined });
  }

  @Get(':id/internal-notes')
  listInternalNotes(@Param('id') id: string) {
    return this.customers.listInternalNotes(id);
  }

  @Post(':id/internal-notes')
  addInternalNote(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body('content') content: string) {
    return this.customers.addInternalNote(id, user.sub, content);
  }

  @Get(':id/work-items')
  listWorkItems(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: CustomerWorkItemStatus,
    @Query('mine') mine?: string,
  ) {
    return this.customers.listWorkItems(id, {
      status,
      mine: mine === '1' ? user.sub : undefined,
    });
  }

  @Post(':id/work-items')
  createWorkItem(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.customers.createWorkItem(id, user.sub, {
      title: String(body.title ?? ''),
      description: body.description ? String(body.description) : undefined,
      category: body.category as Parameters<CustomersService['createWorkItem']>[2]['category'],
      assignedToId: body.assignedToId ? String(body.assignedToId) : undefined,
      projectId: body.projectId ? String(body.projectId) : undefined,
      dueDate: body.dueDate ? new Date(String(body.dueDate)) : undefined,
    });
  }

  @Patch(':id/work-items/:itemId/status')
  updateWorkItemStatus(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { status: CustomerWorkItemStatus; note?: string },
  ) {
    return this.customers.updateWorkItemStatus(id, itemId, user.sub, user.role as UserRole, body.status, body.note);
  }

  @Post(':id/work-items/:itemId/updates')
  addWorkItemUpdate(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { body: string; toStatus?: CustomerWorkItemStatus },
  ) {
    return this.customers.addWorkItemUpdate(id, itemId, user.sub, body.body, body.toStatus);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string) {
    return this.customers.getTimeline(id);
  }

  @Post(':id/recalc-score')
  recalcScore(@Param('id') id: string) {
    return this.customers.recalcBusinessScore(id);
  }

  @Get(':id/documents')
  listDocuments(@Param('id') id: string) {
    return this.customers.listDocuments(id);
  }

  @Post(':id/documents')
  createDocument(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.customers.createDocument(id, user.sub, body as Parameters<CustomersService['createDocument']>[2]);
  }

  @Patch(':id/documents/:docId/verify')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  verifyDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { status: 'VERIFIED' | 'REJECTED'; rejectionReason?: string },
  ) {
    return this.customers.verifyDocument(id, docId, user.sub, body.status, body.rejectionReason);
  }

  @Get(':id/domains')
  listDomains(@Param('id') id: string) {
    return this.customers.listDomains(id);
  }

  @Post(':id/domains')
  createDomain(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.customers.createDomain(id, body as Parameters<CustomersService['createDomain']>[1]);
  }

  @Patch(':id/domains/:domainId')
  updateDomain(
    @Param('id') id: string,
    @Param('domainId') domainId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.customers.updateDomain(id, domainId, body as Parameters<CustomersService['updateDomain']>[2]);
  }

  @Delete(':id/domains/:domainId')
  removeDomain(@Param('id') id: string, @Param('domainId') domainId: string) {
    return this.customers.removeDomain(id, domainId);
  }

  @Get(':id/hosting')
  listHosting(@Param('id') id: string) {
    return this.customers.listHosting(id);
  }

  @Post(':id/hosting')
  createHosting(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.customers.createHosting(id, body as Parameters<CustomersService['createHosting']>[1]);
  }

  @Patch(':id/hosting/:hostId')
  updateHosting(
    @Param('id') id: string,
    @Param('hostId') hostId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.customers.updateHosting(id, hostId, body as Parameters<CustomersService['updateHosting']>[2]);
  }

  @Delete(':id/hosting/:hostId')
  removeHosting(@Param('id') id: string, @Param('hostId') hostId: string) {
    return this.customers.removeHosting(id, hostId);
  }

  @Get(':id/credentials')
  listCredentials(@Param('id') id: string) {
    return this.customers.listCredentials(id);
  }

  @Post(':id/credentials')
  createCredential(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.customers.createCredential(id, user.sub, body as Parameters<CustomersService['createCredential']>[2]);
  }

  @Get(':id/services')
  listServices(@Param('id') id: string) {
    return this.customers.listServices(id);
  }

  @Post(':id/services')
  createService(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.customers.createService(id, body as Parameters<CustomersService['createService']>[1]);
  }

  @Patch(':id/services/:serviceId')
  updateService(
    @Param('id') id: string,
    @Param('serviceId') serviceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.customers.updateService(id, serviceId, body);
  }

  @Delete(':id/services/:serviceId')
  removeService(@Param('id') id: string, @Param('serviceId') serviceId: string) {
    return this.customers.removeService(id, serviceId);
  }

  @Get(':id/revenue-summary')
  getRevenueSummary(@Param('id') id: string) {
    return this.customers.getRevenueSummary(id);
  }

  @Get(':id/payments')
  listPayments(@Param('id') id: string) {
    return this.customers.listPayments(id);
  }

  @Get(':id/email-preview')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  previewNotificationEmail(@Param('id') id: string, @Query('reason') reason: CustomerEmailReason) {
    return this.customers.getNotificationEmailPreview(id, reason);
  }

  @Post(':id/send-email')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  sendNotificationEmail(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: SendCustomerEmailDto,
  ) {
    return this.customers.sendNotificationEmail(id, user.sub, body);
  }

  @Get(':id/credentials/:credId/reveal')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  revealCredential(@Param('credId') credId: string, @CurrentUser() user: JwtPayload) {
    return this.customers.revealCredential(credId, user.sub);
  }
}
