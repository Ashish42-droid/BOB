import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';

/**
 * Production-Grade Raw WebRTC WebSocket Signaling Server (Node.js 'ws')
 * Relays SDP offers, SDP answers, ICE candidates, and room lifecycle events.
 */

// Map of roomId -> Map<WebSocket, { role: string, userId: string, isAlive: boolean }>
const ROOMS = new Map();

export const setupSignalingServer = (httpServer) => {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/signal' || pathname === '/signal/') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, req) => {
    const parsedUrl = url.parse(req.url, true);
    const queryParams = parsedUrl.query || {};

    ws.isAlive = true;
    ws.roomId = queryParams.roomId || null;
    ws.role = queryParams.role || 'UNKNOWN';
    ws.userId = queryParams.userId || `user_${Date.now()}`;

    console.log(`🔌 New WebSocket Connection Established: User ${ws.userId} (${ws.role})`);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (messageRaw) => {
      try {
        const data = JSON.parse(messageRaw.toString());
        handleSignalingMessage(ws, data);
      } catch (err) {
        console.error('Invalid Signaling JSON Message:', err.message);
      }
    });

    ws.on('close', () => {
      handleSocketDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.error(`WebSocket Error [${ws.userId}]:`, err.message);
      handleSocketDisconnect(ws);
    });
  });

  // Heartbeat ping interval every 20 seconds
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(`⚠️ Terminating Dead WebSocket Connection: User ${ws.userId}`);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 20000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  console.log('📡 WebRTC Raw WebSocket Signaling Server mounted on /signal');
  return wss;
};

function handleSignalingMessage(ws, data) {
  const { type, roomId, sdp, candidate, role, userId } = data;
  const targetRoomId = roomId || ws.roomId;

  if (!targetRoomId) {
    ws.send(JSON.stringify({ type: 'error', message: 'roomId is required' }));
    return;
  }

  ws.roomId = targetRoomId;
  if (role) ws.role = role;
  if (userId) ws.userId = userId;

  switch (type) {
    case 'join-room': {
      if (!ROOMS.has(targetRoomId)) {
        ROOMS.set(targetRoomId, new Map());
      }

      const room = ROOMS.get(targetRoomId);

      // Max 2 participants per room (Doctor + Patient/Clinic Assistant)
      if (room.size >= 2 && !room.has(ws)) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Room is full (Maximum 2 participants allowed per call).'
        }));
        return;
      }

      room.set(ws, { role: ws.role, userId: ws.userId });
      console.log(`👤 Peer Joined Room [${targetRoomId}]: User ${ws.userId} (${ws.role}). Room Size: ${room.size}`);

      // Notify the existing peer if a second peer joined
      if (room.size === 2) {
        for (const [peerWs, peerInfo] of room.entries()) {
          if (peerWs !== ws) {
            // Notify existing peer about new peer
            peerWs.send(JSON.stringify({
              type: 'peer-joined',
              role: ws.role,
              userId: ws.userId
            }));

            // Notify new peer about existing peer
            ws.send(JSON.stringify({
              type: 'peer-joined',
              role: peerInfo.role,
              userId: peerInfo.userId
            }));
          }
        }
      } else {
        ws.send(JSON.stringify({
          type: 'joined-waiting',
          message: 'Joined room. Waiting for other participant...'
        }));
      }
      break;
    }

    case 'offer': {
      relayToPeer(targetRoomId, ws, {
        type: 'offer',
        roomId: targetRoomId,
        sdp
      });
      break;
    }

    case 'answer': {
      relayToPeer(targetRoomId, ws, {
        type: 'answer',
        roomId: targetRoomId,
        sdp
      });
      break;
    }

    case 'ice-candidate': {
      relayToPeer(targetRoomId, ws, {
        type: 'ice-candidate',
        roomId: targetRoomId,
        candidate
      });
      break;
    }

    case 'leave-room': {
      console.log(`👋 Peer Left Room [${targetRoomId}]: User ${ws.userId}`);
      relayToPeer(targetRoomId, ws, {
        type: 'peer-left',
        reason: 'LEFT',
        userId: ws.userId
      });
      removeSocketFromRoom(targetRoomId, ws);
      break;
    }

    case 'ping': {
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    }

    default:
      console.warn(`Unknown message type: ${type}`);
  }
}

function relayToPeer(roomId, senderWs, payload) {
  const room = ROOMS.get(roomId);
  if (!room) return;

  for (const [peerWs] of room.entries()) {
    if (peerWs !== senderWs && peerWs.readyState === WebSocket.OPEN) {
      peerWs.send(JSON.stringify(payload));
    }
  }
}

function handleSocketDisconnect(ws) {
  const roomId = ws.roomId;
  if (!roomId || !ROOMS.has(roomId)) return;

  console.log(`🔌 Socket Disconnected: User ${ws.userId} from Room ${roomId}`);
  
  relayToPeer(roomId, ws, {
    type: 'peer-left',
    reason: 'DISCONNECTED',
    userId: ws.userId
  });

  removeSocketFromRoom(roomId, ws);
}

function removeSocketFromRoom(roomId, ws) {
  const room = ROOMS.get(roomId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) {
      ROOMS.delete(roomId);
      console.log(`🗑️ Room Empty & Cleaned Up: ${roomId}`);
    }
  }
}
