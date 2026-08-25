import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../guards/csrf.guard.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private cookie(res:any,token:string){res.cookie('access_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:15*60*1000,path:'/'});}
  @Post('login') async login(@Body() b:any,@Req() req:any,@Res({passthrough:true}) res:any){const r=await this.auth.login(String(b.username??''),String(b.password??''),req.ip);this.cookie(res,r.token);return {user:r.user};}
  @Post('logout') @UseGuards(AuthGuard, CsrfGuard) async logout(@Req() req:any,@Res({passthrough:true}) res:any){await this.auth.logout(req.cookies.access_session);res.clearCookie('access_session',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});return {success:true};}
  @Post('refresh') @UseGuards(CsrfGuard) async refresh(@Req() req:any,@Res({passthrough:true}) res:any){const r=await this.auth.refresh(req.cookies?.access_session);this.cookie(res,r.token);return {user:r.user};}
  @Get('me') @UseGuards(AuthGuard) me(@CurrentUser() user:any){return {user};}
  @Post('change-password') @UseGuards(AuthGuard, CsrfGuard) change(@CurrentUser() user:any,@Body() b:any){return this.auth.changePassword(user.id,String(b.currentPassword??''),String(b.newPassword??''));}
}


