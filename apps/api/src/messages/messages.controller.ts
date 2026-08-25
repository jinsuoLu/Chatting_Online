import { Controller, Delete, Get, Headers, Param, Query } from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import type { Actor } from '../rooms/rooms.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
@Controller('rooms/:roomId')
export class MessagesController {
  constructor(private readonly messages: MessagesService, private readonly realtime: RealtimeGateway) {}
  private actor(id?: string, role?: string): Actor { return { id: id ?? '', role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN' }; }
  @Get('messages') list(@Param('roomId') roomId: string, @Query('after') after: string | undefined, @Headers('x-user-id') id?: string, @Headers('x-user-role') role?: string) { return this.messages.list(this.actor(id, role), roomId, after); }
  @Delete('messages/:messageId') remove(@Param('roomId') roomId: string, @Param('messageId') messageId: string, @Headers('x-user-id') id?: string, @Headers('x-user-role') role?: string) { return this.messages.remove(this.actor(id, role), roomId, messageId); }
  @Get('online-count') count(@Param('roomId') roomId: string, @Headers('x-user-id') id?: string, @Headers('x-user-role') role?: string) { return this.messages.onlineCount(this.actor(id, role), roomId, this.realtime.onlineCount(roomId)); }
}