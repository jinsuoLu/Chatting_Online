import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagesService } from '../messages/messages.service.js';
import { VisitorsService } from '../visitors/visitors.service.js';

type UploadedImage = { buffer: Buffer; size: number; mimetype?: string };

@Controller()
export class UploadsController {
  constructor(
    private readonly messages: MessagesService,
    private readonly visitors: VisitorsService,
  ) {}

  @Post('rooms/:roomId/images')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async upload(
    @Param('roomId') roomId: string,
    @Headers('x-visitor-session') sessionToken: string | undefined,
    @UploadedFile() image: UploadedImage | undefined,
  ) {
    if (!image) throw new BadRequestException('IMAGE_REQUIRED');
    if (!sessionToken) throw new BadRequestException('VISITOR_SESSION_REQUIRED');
    const visitor = await this.visitors.authenticate(sessionToken);
    if (visitor.roomId !== roomId) throw new BadRequestException('ROOM_FORBIDDEN');
    await this.visitors.assertRoomActive(roomId);
    return this.messages.createImage(visitor, image);
  }

  @Get('uploads/:messageId')
  async image(@Param('messageId') messageId: string) {
    const file = await this.messages.imageFile(messageId);
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      disposition: 'inline',
    });
  }
}
