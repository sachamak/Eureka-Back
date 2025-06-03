/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initSocket = (server: HttpServer) => {
  const origins = ['http://localhost:3002', 'http://localhost:5173'];
  if (process.env.DOMAIN_BASE) origins.push(process.env.DOMAIN_BASE);

  io = new Server(server, {
    cors: {
      origin: origins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Referer'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('[SOCKET] New connection:', socket.id);

    socket.on('authenticate', (data) => {
      if (data && data.userId) {
        socket.join(data.userId);
        console.log(`[SOCKET] User ${data.userId} joined their room`);
      }
    });

    socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const recentNotifications = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 5000;

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentNotifications.entries()) {
    if (now - timestamp > NOTIFICATION_COOLDOWN) {
      recentNotifications.delete(key);
    }
  }
}, NOTIFICATION_COOLDOWN);

export const emitNotification = (userId: string, notification: any) => {
  try {
    const io = getIO();
    const key = `${userId}_${notification._id || `${notification.matchId}_${Date.now()}`}`;

    if (recentNotifications.has(key)) return;
    recentNotifications.set(key, Date.now());

    io.to(userId).emit('match_notification', notification);
    console.log(`[SOCKET] Emitted match notification to user ${userId}`);
  } catch (error) {
    console.error('Emit notification error:', error);
  }
};
