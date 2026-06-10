import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotepadService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.userNote.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(userId: string, data?: { title?: string; body?: string }) {
    return this.prisma.userNote.create({
      data: {
        userId,
        title: data?.title?.trim() || 'Untitled',
        body: data?.body ?? '',
        isDraft: true,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: { title?: string; body?: string; isDraft?: boolean },
  ) {
    const note = await this.prisma.userNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.userId !== userId) throw new ForbiddenException('You can only edit your own notes');

    return this.prisma.userNote.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() || 'Untitled' } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.isDraft !== undefined ? { isDraft: data.isDraft } : {}),
      },
    });
  }

  async remove(id: string, userId: string) {
    const note = await this.prisma.userNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.userId !== userId) throw new ForbiddenException('You can only delete your own notes');
    await this.prisma.userNote.delete({ where: { id } });
    return { success: true };
  }
}
