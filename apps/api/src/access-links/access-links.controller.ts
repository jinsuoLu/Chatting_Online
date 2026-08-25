import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { AccessLinksService } from './access-links.service.js';
@Controller()
export class AccessLinksController {
 constructor(private readonly service:AccessLinksService){}
 @Post('rooms/:roomId/access-links') create(@Param('roomId') roomId:string,@Body() body:any,@Req() req:any){return this.service.create(roomId,req.user?.id??body.createdBy,{expiresAt:body.expiresAt,maxUses:body.maxUses,batch:body.batch});}
 @Get('rooms/:roomId/access-links') list(@Param('roomId') roomId:string,@Req() req:any){return this.service.list(roomId,req.user?.id??req.query.adminId);}
 @Post('access-links/:id/revoke') revoke(@Param('id') id:string,@Req() req:any){return this.service.revoke(id,req.user?.id??req.body?.adminId);}
 @Post('access-links/:id/rotate') rotate(@Param('id') id:string,@Body() body:any,@Req() req:any){return this.service.rotate(id,req.user?.id??body.createdBy,body.expiresAt,body.maxUses);}
}
