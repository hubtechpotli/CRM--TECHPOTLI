import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';
import { NotepadService } from './notepad.service';

@Controller('notepad/notes')
@UseGuards(AuthGuard('jwt'))
export class NotepadController {
  constructor(private notepad: NotepadService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.notepad.findAll(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: { title?: string; body?: string }) {
    return this.notepad.create(user.sub, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { title?: string; body?: string; isDraft?: boolean },
  ) {
    return this.notepad.update(id, user.sub, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.notepad.remove(id, user.sub);
  }
}
