import {
  BadRequestException,
  Body,
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

  private static readonly MAX_BYTES = 20 * 1024 * 1024;

  @UseGuards(AuthGuard('jwt'))
  @Post('presign')
  async presign(
    @Body() body: { filename?: string; mimeType?: string; size?: number; folder?: string },
  ) {
    const filename = body.filename?.trim();
    const mimeType = body.mimeType?.trim() || 'application/octet-stream';
    if (!filename) throw new BadRequestException('filename is required');
    if (body.size != null && body.size > UploadsController.MAX_BYTES) {
      throw new BadRequestException('File exceeds 20MB limit');
    }
    if (process.env.ENABLE_PRESIGNED_UPLOAD === 'false') {
      throw new BadRequestException('Presigned upload disabled');
    }
    return this.s3.getPresignedUploadUrl(filename, mimeType, body.folder || 'files');
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('complete')
  async complete(@Body() body: { key?: string; filename?: string; mimeType?: string; size?: number }) {
    const key = body.key?.trim();
    if (!key) throw new BadRequestException('key is required');
    const exists = await this.s3.objectExists(key);
    if (!exists) throw new BadRequestException('Upload not found in storage');
    return {
      key,
      filename: body.filename || key.split('/').pop(),
      mimeType: body.mimeType,
      size: body.size,
    };
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
