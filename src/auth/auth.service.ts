import { RefreshToken } from './../../node_modules/.prisma/client/index.d';
import { BadRequestException, Injectable, UseGuards } from '@nestjs/common';
import { RegisterDto } from './dto/register';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login';
import { UserService } from 'src/user/user.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private readonly userService: UserService,
  ) {}
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new Error('Пользователь с таким email уже зарегистрирован.');
    }

    const saltOrRounds = 10;
    const password = dto.password;
    const hash = await bcrypt.hash(password, saltOrRounds);

    dto.password = hash;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        password: hash,
      },
    });

    const accessToken = this.jwtService.sign(
      {
        email: dto.email,
      },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      {
        email: dto.email,
      },
      { secret: process.env.JWT_REFRESH, expiresIn: '30d' },
    );

    if (!accessToken || !refreshToken) {
      throw new BadRequestException('Не удалось создать токены.');
    }

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
      },
    });

    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.getUser({
      email: dto.email,
    });

    if (!user) {
      throw new BadRequestException('Пользователь не найден.');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);

    if (!isValid) {
      throw new BadRequestException('Неверный пароль.');
    }

    const accessToken = this.jwtService.sign(
      {
        email: user.email,
      },
      { secret: process.env.JWT_SECRET, expiresIn: '30m' },
    );

    return accessToken;
  }

  async authMe(email: string) {
    return await this.userService.getUser({
      email,
    });
  }
}
