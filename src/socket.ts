// import { Server as HttpServer } from 'http';
// import { Server, Socket } from 'socket.io';
// import { createAdapter } from '@socket.io/redis-adapter';
// import { createClient } from 'redis';
// import jwt from 'jsonwebtoken';

// // This Map will store the online status of users on this specific server instance.
// // Redis will handle keeping all instances in sync.
// const onlineUsers = new Map<number, string>();

// export const initSocketServer = (httpServer: HttpServer) => {
//   const io = new Server(httpServer, {
//     cors: {
//       // Your specific frontend URL from Vercel.
//       // This is more secure than allowing all origins.
//       origin: "https://wakilifrontend.vercel.app", 
//       methods: ["GET", "POST"]
//     }
//   });

//   // --- Connect to Redis for Scalability ---
//   // This is the critical part that makes your app work correctly on Render.
//   // It reads the connection URL from the environment variable you set on Render.
//   const pubClient = createClient({ url: process.env.REDIS_URL });

//   (async () => {
//     const subClient = await pubClient.duplicate();

//     if (!subClient) {
//       throw new Error('Failed to duplicate pubClient for Redis adapter.');
//     }

//     await Promise.all([pubClient.connect(), subClient.connect()]);
//     // This command tells Socket.IO to use Redis for all internal messaging.
//     // Now, an `io.emit()` from one server instance will be broadcast to ALL instances.
//     io.adapter(createAdapter(pubClient, subClient));
//     console.log('✅ Socket.IO is now connected to Redis and ready for scaling.');
//   })().catch((err) => {
//     // This log is vital for debugging connection issues on Render.
//     console.error('❌ Failed to connect Socket.IO to Redis. Check the REDIS_URL environment variable.', err);
//   });
//   // --- End of Redis Setup ---


//   // This runs for every single client that connects to your server
//   io.on('connection', (socket: Socket) => {
//     console.log(`[Socket.IO] New client connected: ${socket.id}`);

//     // 1. Listen for the 'authenticate' event sent by the client after connecting
//     socket.on('authenticate', (token: string) => {
//       try {
//         if (!process.env.JWT_SECRET) {
//           throw new Error("JWT_SECRET is not defined on the server");
//         }

//         // Verify the token to securely get the user's ID
//         const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
//         const userId = decoded.userId;

//         if (userId) {
//           console.log(`[Socket.IO] Socket ${socket.id} authenticated for user ${userId}`);
          
//           // Add this user to this instance's list of online users
//           onlineUsers.set(userId, socket.id);
          
//           // Broadcast to EVERYONE that this user is now online
//           io.emit('user-status-change', { userId, isOnline: true });

//           // Also, send the complete list of all currently online users ONLY to the new client
//           socket.emit('online-users-list', Array.from(onlineUsers.keys()));
//         }
//       } catch (error: any) {
//         console.error('[Socket.IO] Authentication failed:', error.message);
//         socket.disconnect(); // Disconnect clients with invalid tokens
//       }
//     });

//     // 2. Handle what happens when a client disconnects (e.g., closes tab)
//     socket.on('disconnect', () => {
//       console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
//       let disconnectedUserId: number | null = null;
      
//       // Find which user this socket belonged to
//       for (const [userId, socketId] of onlineUsers.entries()) {
//         if (socketId === socket.id) {
//           disconnectedUserId = userId;
//           onlineUsers.delete(userId); // Remove them from this instance's list
//           break;
//         }
//       }

//       // If we found a user, broadcast to EVERYONE that they are now offline
//       if (disconnectedUserId) {
//         console.log(`[Socket.IO] User ${disconnectedUserId} went offline.`);
//         io.emit('user-status-change', { userId: disconnectedUserId, isOnline: false });
//       }
//     });
//   });

//   return io;
// };