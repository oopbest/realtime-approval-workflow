// Custom WebSocket server integrated with Next.js
// Uses 'noServer' mode to avoid conflicts with Next.js HMR WebSocket
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory store
const requests = [];

// Track connected clients
const clients = new Map(); // Map<WebSocket, { userId, userName, role }>

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // API: GET /api/requests
      if (parsedUrl.pathname === '/api/requests' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const sorted = [...requests].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        res.end(JSON.stringify(sorted));
        return;
      }

      // API: POST /api/requests
      if (parsedUrl.pathname === '/api/requests' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          const data = JSON.parse(body);
          const newRequest = {
            id: uuidv4(),
            title: data.title,
            description: data.description,
            amount: data.amount,
            status: 'pending',
            createdBy: data.createdBy,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          requests.push(newRequest);
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
        req.on('end', () => {
          const data = JSON.parse(body);
          const id = patchMatch[1];
          const index = requests.findIndex((r) => r.id === id);
          if (index === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request not found' }));
            return;
          }
          requests[index] = {
            ...requests[index],
            ...data,
            updatedAt: new Date().toISOString(),
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(requests[index]));
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
  // Using noServer: true so we can manually handle upgrade events
  // and avoid conflicts with Next.js HMR WebSocket
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade events manually
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url, true);

    // Only handle upgrades to /ws path — let Next.js handle its own (/_next/*)
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // For any other path (like /_next/webpack-hmr), do NOT handle it here
    // Next.js will handle its own HMR WebSocket connections
  });

  wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket connection');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Received:', message.type);

        switch (message.type) {
          // Client registers with their role
          case 'connection': {
            const { userId, userName, role } = message.payload;
            clients.set(ws, { userId, userName, role });
            console.log(`✅ ${userName} connected as ${role}`);

            // Send current requests list
            ws.send(
              JSON.stringify({
                type: 'requests-list',
                payload: [...requests].sort(
                  (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                ),
              })
            );
            break;
          }

          // Maker creates a new request
          case 'new-request': {
            const { title, description, amount, createdBy } = message.payload;
            const newRequest = {
              id: uuidv4(),
              title,
              description,
              amount,
              status: 'pending',
              createdBy,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            requests.push(newRequest);
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
            const index = requests.findIndex((r) => r.id === requestId);
            if (index !== -1) {
              requests[index] = {
                ...requests[index],
                status: 'approved',
                approvedBy,
                comment: comment || '',
                updatedAt: new Date().toISOString(),
              };
              console.log(`✅ Request approved: ${requests[index].title}`);

              // Broadcast update to all clients
              broadcast({
                type: 'request-updated',
                payload: requests[index],
              });

              // Notify the maker
              broadcastToUser(requests[index].createdBy, {
                type: 'notification',
                payload: {
                  message: `✅ คำขอ "${requests[index].title}" ได้รับอนุมัติจาก ${approvedBy}`,
                  type: 'success',
                  requestId,
                },
              });
            }
            break;
          }

          // Approver rejects a request
          case 'reject-request': {
            const reqPayload = message.payload;
            const idx = requests.findIndex((r) => r.id === reqPayload.requestId);
            if (idx !== -1) {
              requests[idx] = {
                ...requests[idx],
                status: 'rejected',
                approvedBy: reqPayload.approvedBy,
                comment: reqPayload.comment || '',
                updatedAt: new Date().toISOString(),
              };
              console.log(`❌ Request rejected: ${requests[idx].title}`);

              // Broadcast update to all clients
              broadcast({
                type: 'request-updated',
                payload: requests[idx],
              });

              // Notify the maker
              broadcastToUser(requests[idx].createdBy, {
                type: 'notification',
                payload: {
                  message: `❌ คำขอ "${requests[idx].title}" ถูกปฏิเสธจาก ${reqPayload.approvedBy}`,
                  type: 'error',
                  requestId: reqPayload.requestId,
                },
              });
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
    `);
  });
});
