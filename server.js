console.log('[START] server.js initialized');
// Custom WebSocket server integrated with Next.js
// Uses 'noServer' mode to avoid conflicts with Next.js HMR WebSocket
// Uses Prisma + SQLite for persistent data storage
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Prisma Client with better-sqlite3 driver adapter (Prisma 7)
const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

// Track connected clients
const clients = new Map(); // Map<WebSocket, { userId, userName, role }>

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // API: GET /api/requests
      if (parsedUrl.pathname === '/api/requests' && req.method === 'GET') {
        const allRequests = await prisma.approvalRequest.findMany({
          orderBy: { createdAt: 'desc' },
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(allRequests));
        return;
      }

      // API: POST /api/requests
      if (parsedUrl.pathname === '/api/requests' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          const data = JSON.parse(body);
          const newRequest = await prisma.approvalRequest.create({
            data: {
              title: data.title,
              description: data.description,
              amount: data.amount,
              createdBy: data.createdBy,
            },
          });
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(newRequest));
        });
        return;
      }

      // API: PATCH /api/requests/:id
      const patchMatch = parsedUrl.pathname?.match(/^\/api\/requests\/(.+)$/);
      if (patchMatch && req.method === 'PATCH') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          const data = JSON.parse(body);
          const id = patchMatch[1];
          try {
            const updated = await prisma.approvalRequest.update({
              where: { id },
              data,
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(updated));
          } catch (err) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request not found' }));
          }
        });
        return;
      }

      // Let Next.js handle everything else
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // ========================================
  // WebSocket Server Setup (noServer mode)
  // ========================================
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade events manually
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url, true);

    // Only handle upgrades to /ws path
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket connection');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Received:', message.type);

        switch (message.type) {
          // Client registers with their role
          case 'connection': {
            const { userId, userName, role } = message.payload;
            clients.set(ws, { userId, userName, role });
            console.log(`✅ ${userName} connected as ${role}`);

            // Send current requests list from database
            const allRequests = await prisma.approvalRequest.findMany({
              orderBy: { createdAt: 'desc' },
            });
            ws.send(
              JSON.stringify({
                type: 'requests-list',
                payload: allRequests,
              })
            );
            break;
          }

          // Maker creates a new request
          case 'new-request': {
            const { title, description, amount, createdBy } = message.payload;
            const newRequest = await prisma.approvalRequest.create({
              data: { title, description, amount, createdBy },
            });
            console.log(`📝 New request created: ${title}`);

            // Broadcast to all connected clients
            broadcast({
              type: 'request-created',
              payload: newRequest,
            });

            // Send notification to approvers
            broadcastToRole('approver', {
              type: 'notification',
              payload: {
                message: `📋 คำขอใหม่ "${title}" จาก ${createdBy} (฿${Number(amount).toLocaleString()})`,
                type: 'info',
                requestId: newRequest.id,
              },
            });
            break;
          }

          // Approver approves a request
          case 'approve-request': {
            const { requestId, approvedBy, comment } = message.payload;
            try {
              const updated = await prisma.approvalRequest.update({
                where: { id: requestId },
                data: {
                  status: 'approved',
                  approvedBy,
                  comment: comment || '',
                },
              });
              console.log(`✅ Request approved: ${updated.title}`);

              // Broadcast update to all clients
              broadcast({
                type: 'request-updated',
                payload: updated,
              });

              // Notify the maker
              broadcastToUser(updated.createdBy, {
                type: 'notification',
                payload: {
                  message: `✅ คำขอ "${updated.title}" ได้รับอนุมัติจาก ${approvedBy}`,
                  type: 'success',
                  requestId,
                },
              });
            } catch (err) {
              console.error('Error approving request:', err);
            }
            break;
          }

          // Approver rejects a request
          case 'reject-request': {
            const reqPayload = message.payload;
            try {
              const updated = await prisma.approvalRequest.update({
                where: { id: reqPayload.requestId },
                data: {
                  status: 'rejected',
                  approvedBy: reqPayload.approvedBy,
                  comment: reqPayload.comment || '',
                },
              });
              console.log(`❌ Request rejected: ${updated.title}`);

              // Broadcast update to all clients
              broadcast({
                type: 'request-updated',
                payload: updated,
              });

              // Notify the maker
              broadcastToUser(updated.createdBy, {
                type: 'notification',
                payload: {
                  message: `❌ คำขอ "${updated.title}" ถูกปฏิเสธจาก ${reqPayload.approvedBy}`,
                  type: 'error',
                  requestId: reqPayload.requestId,
                },
              });
            } catch (err) {
              console.error('Error rejecting request:', err);
            }
            break;
          }

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      const clientInfo = clients.get(ws);
      if (clientInfo) {
        console.log(`👋 ${clientInfo.userName} disconnected`);
      }
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      clients.delete(ws);
    });
  });

  // ========================================
  // Helper: Broadcast to all connected clients
  // ========================================
  function broadcast(message) {
    const data = JSON.stringify(message);
    clients.forEach((info, client) => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }

  // ========================================
  // Helper: Broadcast to clients with specific role
  // ========================================
  function broadcastToRole(role, message) {
    const data = JSON.stringify(message);
    clients.forEach((info, client) => {
      if (client.readyState === 1 && info.role === role) {
        client.send(data);
      }
    });
  }

  // ========================================
  // Helper: Broadcast to a specific user by name
  // ========================================
  function broadcastToUser(userName, message) {
    const data = JSON.stringify(message);
    clients.forEach((info, client) => {
      if (client.readyState === 1 && info.userName === userName) {
        client.send(data);
      }
    });
  }

  server.listen(port, () => {
    console.log(`
  🚀 Server ready on http://${hostname}:${port}
  📡 WebSocket server running on ws://${hostname}:${port}/ws
  💾 Database: Prisma + SQLite (prisma/dev.db)
    `);
  });
});
