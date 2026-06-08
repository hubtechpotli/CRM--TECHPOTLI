import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as fs from 'fs';
import { S3Service } from './s3.service';

@Controller('uploads')
export class UploadsController {
  constructor(private s3: S3Service) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException('No file received — check multipart form field name is "file"');
    }
    const result = await this.s3.upload(file.buffer, file.originalname, file.mimetype);
    return { ...result, filename: file.originalname, size: file.size };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('signed-url')
  async getSignedUrl(@Query('key') key: string) {
    if (!key?.trim()) throw new BadRequestException('key query parameter is required');
    const url = await this.s3.getAccessUrl(key.trim());
    return { url };
  }

  @Get('local/*')
  serveLocal(@Param('0') key: string, @Res() res: Response) {
    const filePath = this.s3.getLocalPath(key);
    if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
    return res.sendFile(filePath);
  }
}
