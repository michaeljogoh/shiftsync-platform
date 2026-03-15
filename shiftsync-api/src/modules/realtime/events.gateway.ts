import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { User } from '../users/entities/user.entity';
import type { JwtPayload } from '../auth/auth.types';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.headers?.authorization as string)?.replace?.('Bearer ', '');
    if (!token) {
      client.emit('error', { error: 'Unauthorized' });
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      const user = await this.usersRepo.findOne({
        where: { id: payload.sub },
        relations: ['managedLocations'],
      });
      if (!user || !user.isActive) {
        client.emit('error', { error: 'Unauthorized' });
        client.disconnect(true);
        return;
      }
      (client as Socket & { data: { userId?: string; role?: string } }).data.userId = user.id;
      (client as Socket & { data: { userId?: string; role?: string } }).data.role = user.role;

      client.join(`user_${user.id}`);

      if (user.role === 'admin') {
        client.join('admin_feed');
      }
      if (user.role === 'manager' && user.managedLocations?.length) {
        for (const loc of user.managedLocations) {
          client.join(`location_${loc.id}`);
        }
      }

      this.logger.log(`Client connected: user_${user.id} (${user.role})`);
    } catch {
      client.emit('error', { error: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client as Socket & { data: { userId?: string } }).data?.userId;
    if (userId) {
      this.logger.log(`Client disconnected: user_${userId}`);
    }
  }
}
