import {
  BadRequestException,
  Injectable,
  Res,
  UseGuards,
} from '@nestjs/common';
import { RegisterDto } from './dto/register';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private readonly userService: UserService,
  ) {}
  async register(dto: RegisterDto, @Res() res) {
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
        username: dto.username,
        password: hash,
      },
    });

    const { accessToken, refreshToken } = await this.getTokens(user.email);

    if (!accessToken || !refreshToken) {
      throw new BadRequestException('Не удалось создать токены.');
    }

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return accessToken;
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

    const { accessToken } = await this.getTokens(user.email);

    return accessToken;
  }

  async authMe(email: string) {
    return await this.userService.getUser({
      email,
    });
  }

  async getTokens(email: string) {
    const accessToken = this.jwtService.sign({
      email,
    });

    const refreshToken = this.jwtService.sign(
      {
        email,
      },
      { secret: process.env.JWT_REFRESH, expiresIn: '30d' },
    );

    return { accessToken, refreshToken };
  }
}
