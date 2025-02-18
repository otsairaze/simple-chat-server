import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UserDto } from './dto/user';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUser({ email, id }: UserDto) {
    if (!email && !id) {
      throw new BadRequestException('Пользователь не найден');
    }

    return await this.prisma.user.findFirst({ where: { email, id } });
  }

  async getUsers() {
    if (!this.prisma.user.findMany) {
      throw new BadRequestException('Пользователи не найдены');
    }

    return await this.prisma.user.findMany();
  }
}
