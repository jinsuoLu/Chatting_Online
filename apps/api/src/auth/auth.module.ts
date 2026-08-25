import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminsController } from '../admins/admins.controller.js';
import { AuthGuard } from '../guards/auth.guard.js';
import { CsrfGuard } from '../guards/csrf.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { PrismaService } from '../prisma.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  controllers: [AuthController, AdminsController],
  providers: [AuthService, AuthGuard, RolesGuard, CsrfGuard, PrismaService, Reflector],
  exports: [AuthService, AuthGuard, RolesGuard, CsrfGuard],
})
export class AuthModule {}
