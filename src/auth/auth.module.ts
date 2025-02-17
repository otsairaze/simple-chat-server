import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { JwtStrategy } from 'src/strategy/jwt.strategy';

@Module({
  providers: [AuthService, PrismaService, JwtService, UserService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
