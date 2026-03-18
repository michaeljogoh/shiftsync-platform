import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { EventsGateway } from './events.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: EventsGateway) {}

  private get server(): Server | undefined {
    return (this.gateway as EventsGateway & { server?: Server }).server;
  }

  emitToRoom(room: string, event: string, payload: unknown): void {
    this.server?.to(room).emit(event, payload);
  }

  emitToRooms(rooms: string[], event: string, payload: unknown): void {
    if (!this.server) return;
    for (const room of rooms) {
      this.server.to(room).emit(event, payload);
    }
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.emitToRoom(`user_${userId}`, event, payload);
  }

  emitToLocation(locationId: string, event: string, payload: unknown): void {
    this.emitToRoom(`location_${locationId}`, event, payload);
  }
}
