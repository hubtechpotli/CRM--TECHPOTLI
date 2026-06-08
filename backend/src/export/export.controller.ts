import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ExportService } from './export.service';

@Controller('export')
@UseGuards(AuthGuard('jwt'))
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get(':module/excel')
  async excel(@Param('module') module: string, @Res() res: Response) {
    const buffer = await this.exportService.toExcel(module);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${module}-export.xlsx`);
    res.send(buffer);
  }

  @Get(':module/pdf')
  async pdf(@Param('module') module: string, @Res() res: Response) {
    const buffer = await this.exportService.toPdf(module);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${module}-export.pdf`);
    res.send(buffer);
  }
}
