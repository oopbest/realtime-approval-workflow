const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('Connected');
  
  // Register as approver
  ws.send(JSON.stringify({
    type: 'connection',
    payload: { userId: 'tester1', userName: 'TestApprover', role: 'approver' }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', message.type);
  
  if (message.type === 'requests-list') {
    const list = message.payload;
    const pending = list.find(r => r.status === 'pending');
    
    if (pending) {
      console.log('Found pending request:', pending.id);
      
      // Try to approve it
      ws.send(JSON.stringify({
        type: 'approve-request',
        payload: {
          requestId: pending.id,
          approvedBy: 'TestApprover',
          comment: 'Looks good'
        }
      }));
    } else {
      console.log('No pending requests to approve.');
      process.exit(0);
    }
  } else if (message.type === 'request-updated') {
    console.log('Approval success!', message.payload);
    process.exit(0);
  }
});
