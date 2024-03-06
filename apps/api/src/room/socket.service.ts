import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

const Messages = {
  TO_CLIENT: {
    people: 'people',
    cards: 'cards'
  },
  FROM_CLIENT: {
    disconnect: 'disconnect',
    join_me: 'join_me',
    vote: 'vote',
    clear_votes: 'clear_votes',
    hide_unHide: 'hide_unHide'
  }
}

@Injectable()
export class SocketService {
  private readonly allRooms: Map<String, Array<any>> = new Map();
  private readonly connectedClients: Map<string, Socket> = new Map();

  handleConnection(socket: Socket): void {
    const clientId = socket.id;
    this.connectedClients.set(clientId, socket);

    socket.on(Messages.FROM_CLIENT.disconnect, (data: any) => {
      console.log(`[${Messages.FROM_CLIENT.disconnect}]`, socket.id, clientId, data);
      this.connectedClients.delete(clientId);

      for (let i = 0; i < this.allRooms.size; i++) {
        let roomId = (Array.from(this.allRooms.keys())[i]).toString();
        let room = this.allRooms.get(roomId);
        const index = room.findIndex((e) => { return e.socketId == clientId });
        if (index > -1) {
          room.splice(index, 1);
          console.log(`disconnected from [${roomId}`)
          this.emitPeople(socket, roomId, this.allRooms.get(roomId));
        }
      }
    });

    socket.on(Messages.FROM_CLIENT.join_me, (data: any) => {
      console.log(`[${Messages.FROM_CLIENT.join_me}]`, socket.id, clientId, data);
      if (!this.allRooms.has(data.roomId)) {
        this.allRooms.set(data.roomId, []);
      }
      this.allRooms.get(data.roomId).push({ userName: data.userName, socketId: socket.id, vote: null, hide: true });

      socket.join(data.roomId);

      this.emitPeople(socket, data.roomId, this.allRooms.get(data.roomId));
      this.emitCards(socket, data.roomId);
    });

    socket.on(Messages.FROM_CLIENT.vote, (data: any) => {
      console.log(`[${Messages.FROM_CLIENT.vote}]`, socket.id, clientId, data);
      const roomId = data.roomId
      let room = this.allRooms.get(roomId);

      const index = room.findIndex((e) => { return e.socketId == data.userId });
      if (index > -1) {
        const user = room.splice(index, 1);
        let newUser = { ...user[0] };
        newUser['vote'] = data.vote;
        room.push(newUser);
        this.emitPeople(socket, roomId, this.allRooms.get(roomId));
      }
    });

    socket.on(Messages.FROM_CLIENT.clear_votes, (data: any) => {
      console.log(`[${Messages.FROM_CLIENT.clear_votes}]`, socket.id, clientId, data);
      const roomId = data.roomId
      let room = this.allRooms.get(roomId);
      for (let i = 0; i < room.length; i++) {
        const user = room[i];
        user.vote = null;
      }
      this.emitPeople(socket, roomId, this.allRooms.get(roomId));
    });

    socket.on(Messages.FROM_CLIENT.hide_unHide, (data: any) => {
      console.log(`[${Messages.FROM_CLIENT.hide_unHide}]`, socket.id, clientId, data);
      const roomId = data.roomId
      let room = this.allRooms.get(roomId);
      for (let i = 0; i < room.length; i++) {
        const user = room[i];
        user.hide = !user.hide
      }
      this.emitPeople(socket, roomId, this.allRooms.get(roomId));
    });

    // Handle other events and messages from the client
  }

  emitPeople = function (socket: Socket, roomId: string, people: Array<any>) {
    const nofityJoined: any = {
      'roomId': roomId,
      'people': this.allRooms.get(roomId)
    };

    socket.emit(Messages.TO_CLIENT.people, nofityJoined);
    socket.broadcast.emit(Messages.TO_CLIENT.people, nofityJoined);
    socket.to(roomId).emit(Messages.TO_CLIENT.people, nofityJoined);
    socket.to(socket.id).emit(Messages.TO_CLIENT.people, nofityJoined);
  }

  emitCards = function (socket: Socket, roomId: string) {
    const nofityCards: any = {
      'roomId': roomId,
      'cards': [
        { text: '☕️', value: '☕️' },
        { text: '1', value: '1' },
        { text: '2', value: '2' },
        { text: '3', value: '3' },
        { text: '5', value: '5' },
        { text: '8', value: '8' },
        { text: '13', value: '13' }
      ]
    };

    socket.emit(Messages.TO_CLIENT.cards, nofityCards);
    socket.broadcast.emit(Messages.TO_CLIENT.cards, nofityCards);
    socket.to(roomId).emit(Messages.TO_CLIENT.cards, nofityCards);
    socket.to(socket.id).emit(Messages.TO_CLIENT.cards, nofityCards);
  }

  // Add more methods for handling events, messages, etc.
}