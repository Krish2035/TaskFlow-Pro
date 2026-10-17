import { Server as HttpServer } from "http";
import { Socket } from "net";
import crypto from "crypto";
import { logger } from "../middleware/logger";

export interface RealtimeEvent {
  type: "TASK_MOVED" | "TASK_CREATED" | "TASK_DELETED" | "USER_JOINED" | "HEARTBEAT";
  taskId?: string;
  title?: string;
  newStatus?: string;
  priority?: string;
  author?: string;
  timestamp?: string;
  payload?: any;
}

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const connectedClients = new Set<Socket>();

export function setupRealtimeWebSocket(server: HttpServer): void {
  server.on("upgrade", (req, socket: Socket, head) => {
    const url = req.url || "/";
    if (!url.startsWith("/ws")) {
      socket.destroy();
      return;
    }

    const secKey = req.headers["sec-websocket-key"];
    if (!secKey || typeof secKey !== "string") {
      socket.destroy();
      return;
    }

    // RFC 6455 Handshake
    const acceptKey = crypto
      .createHash("sha1")
      .update(secKey + WS_GUID)
      .digest("base64");

    const responseHeaders = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
      "\r\n",
    ].join("\r\n");

    socket.write(responseHeaders);
    connectedClients.add(socket);
    logger.info(`⚡ Real-time WebSocket client connected (Total: ${connectedClients.size})`);

    // Send welcome payload
    sendFrame(socket, {
      type: "USER_JOINED",
      author: "System",
      timestamp: new Date().toISOString(),
      payload: { message: "Connected to TaskFlow Pro Real-Time Engine" },
    });

    let buffer = Buffer.alloc(0);

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 2) {
        const firstByte = buffer[0];
        const secondByte = buffer[1];
        const opcode = firstByte & 0x0f;
        const isMasked = (secondByte & 0x80) === 0x80;
        let payloadLen = secondByte & 0x7f;

        let offset = 2;
        if (payloadLen === 126) {
          if (buffer.length < 4) return;
          payloadLen = buffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (buffer.length < 10) return;
          payloadLen = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }

        let maskKey: Buffer | null = null;
        if (isMasked) {
          if (buffer.length < offset + 4) return;
          maskKey = buffer.subarray(offset, offset + 4);
          offset += 4;
        }

        if (buffer.length < offset + payloadLen) return;

        const payload = buffer.subarray(offset, offset + payloadLen);
        buffer = buffer.subarray(offset + payloadLen);

        // Opcode 8 = Close frame
        if (opcode === 0x08) {
          socket.end();
          return;
        }

        // Opcode 9 = Ping
        if (opcode === 0x09) {
          // Send Pong (Opcode 10)
          socket.write(Buffer.from([0x8a, 0x00]));
          continue;
        }

        // Text Frame (Opcode 1)
        if (opcode === 0x01) {
          let text = "";
          if (isMasked && maskKey) {
            const unmasked = Buffer.alloc(payload.length);
            for (let i = 0; i < payload.length; i++) {
              unmasked[i] = payload[i] ^ maskKey[i % 4];
            }
            text = unmasked.toString("utf8");
          } else {
            text = payload.toString("utf8");
          }

          try {
            const event: RealtimeEvent = JSON.parse(text);
            logger.info({ event }, "⚡ Real-time WebSocket event received");
            // Broadcast to all other connected clients
            broadcastRealtime(event, socket);
          } catch {
            // Ignore non-json frames
          }
        }
      }
    });

    socket.on("close", () => {
      connectedClients.delete(socket);
      logger.info(`🔌 WebSocket client disconnected (Remaining: ${connectedClients.size})`);
    });

    socket.on("error", () => {
      connectedClients.delete(socket);
      socket.destroy();
    });
  });
}

function sendFrame(socket: Socket, data: RealtimeEvent): void {
  try {
    const jsonStr = JSON.stringify(data);
    const payloadBuffer = Buffer.from(jsonStr, "utf8");
    const len = payloadBuffer.length;

    let headerBuffer: Buffer;
    if (len <= 125) {
      headerBuffer = Buffer.from([0x81, len]);
    } else if (len <= 65535) {
      headerBuffer = Buffer.alloc(4);
      headerBuffer[0] = 0x81;
      headerBuffer[1] = 126;
      headerBuffer.writeUInt16BE(len, 2);
    } else {
      headerBuffer = Buffer.alloc(10);
      headerBuffer[0] = 0x81;
      headerBuffer[1] = 127;
      headerBuffer.writeBigUInt64BE(BigInt(len), 2);
    }

    socket.write(Buffer.concat([headerBuffer, payloadBuffer]));
  } catch {
    connectedClients.delete(socket);
  }
}

export function broadcastRealtime(event: RealtimeEvent, sender?: Socket): void {
  for (const client of connectedClients) {
    if (client !== sender && !client.destroyed) {
      sendFrame(client, event);
    }
  }
}
