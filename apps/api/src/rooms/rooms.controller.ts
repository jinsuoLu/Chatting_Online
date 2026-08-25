import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { Roles } from '../decorators/roles.decorator.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Actor, BatchCreateInput, CreateRoomInput, RoomsService } from './rooms.service.js';

@Controller('rooms')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}
  @Post() create(@CurrentUser() actor: Actor, @Body() body: CreateRoomInput) { return this.rooms.create(actor, body); }
  @Post('batch') batch(@CurrentUser() actor: Actor, @Body() body: BatchCreateInput) { return this.rooms.batch(actor, body); }
  @Get('batch/:jobId') batchJob(@CurrentUser() actor: Actor, @Param('jobId') jobId: string) { return this.rooms.getBatchJob(actor, jobId); }
  @Get() list(@CurrentUser() actor: Actor) { return this.rooms.list(actor); }
  @Get(':id') get(@CurrentUser() actor: Actor, @Param('id') id: string) { return this.rooms.get(actor, id); }
  @Patch(':id') update(@CurrentUser() actor: Actor, @Param('id') id: string, @Body() body: Partial<CreateRoomInput>) { return this.rooms.update(actor, id, body); }
  @Post(':id/pause') pause(@CurrentUser() actor: Actor, @Param('id') id: string) { return this.rooms.pause(actor, id); }
  @Post(':id/resume') resume(@CurrentUser() actor: Actor, @Param('id') id: string) { return this.rooms.resume(actor, id); }
  @Delete(':id') remove(@CurrentUser() actor: Actor, @Param('id') id: string) { return this.rooms.remove(actor, id); }
}
