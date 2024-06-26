// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron')
const path       = require('path')
const http       = require('http');
const websocket  = require('ws');
const wsClients  = new Map();

let mainWindow;

function createWindow () {

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width:  1700,
    height:  900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true
    }
  })

  // and load the index.html of the app.
  //mainWindow.loadFile('index.html')
  mainWindow.loadURL(`file://${app.getAppPath()}/src/index.html`);

  if (app.commandLine.hasSwitch('inspect'))
      mainWindow.webContents.openDevTools()

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {

  startWebSocketServer();
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

function startWebSocketServer() {

  // https://www.npmjs.com/package/ws#sending-and-receiving-text-data
  console.log(`Starting WebSocket server...`);

  const PORT    = 9920;
  const server  = http.createServer({
                      //cert: readFileSync('/path/to/cert.pem'),
                      //key:  readFileSync('/path/to/key.pem')
                  });
  const wss     = new websocket.Server({ server });

  wss.on('connection', (ws, req) => {

      if (!mainWindow)
          return;

      let   clientId             = "";
      let   clientName           = "";
      const connectionURLSuffix  = req.url?.slice(1);
      const remoteSocket         = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
      const subprotocol          = req.headers['sec-websocket-protocol'];
      const authHeader           = req.headers['authorization'];

      if (authHeader && authHeader.startsWith('Basic ')) {

          const base64Credentials     = authHeader.split(' ')[1];
          const credentials           = Buffer.from(base64Credentials, 'base64').toString('utf8');
          const [username, password]  = credentials.split(':');
          clientId                    = `${username}[${remoteSocket}]`;
          clientName                  = username;

          console.log(`Client '${clientName}' connected from '${remoteSocket}' using HTTP Basic Auth and subprotocol '${subprotocol}'`);

          // if (username !== 'your-username' || password !== 'your-password') {
          //   ws.close(1008, 'Unauthorized: Invalid Basic Auth credentials');
          //   console.log(`Client ${clientId} disconnected due to invalid Basic Auth credentials`);
          //   return;
          // }

      }

      else if (connectionURLSuffix !== "")
      {

          clientId            = `${connectionURLSuffix}[${remoteSocket}]`;
          clientName          = connectionURLSuffix;

          console.log(`Client '${clientName}' connected from '${remoteSocket}' using subprotocol '${subprotocol}'`);

      }

      else {
          ws.close(1008, 'Please use either HTTP Basic Auth or an connection URL suffix!');
          console.log(`Client '${remoteSocket}' disconnected!`);
          return;
      }

      wsClients.set(clientId, ws);

      mainWindow.webContents.send('webSocketClientConnected', { clientId, clientName, remoteSocket, subprotocol });

      ws.on('message', (message, isBinary) => {

          if (!isBinary) {
              const textMessage = message.toString();
              console.log(`Received a web socket text message from ${clientId}: ${message}`);
              mainWindow.webContents.send('wsTextMessageReceived', { clientId, clientName, textMessage });
          } else {
              const binaryMessage = message;
              console.log(`Received a binary web socket message from ${clientId}`);
              mainWindow.webContents.send('wsBinaryMessageReceived', { clientId, clientName, binaryMessage });
          }

      });

      ws.on('close', () => {
          console.log(`Client disconnected: ${clientId}`);
          mainWindow.webContents.send('wsClientDisconnected', { clientId });
          wsClients.delete(clientId);
      });

  });

  server.listen(PORT, () => {
      console.log(`WebSocket server started on port ${PORT}`);
  });

}

ipcMain.on('send-WSTextMessage', (event, { clientId, message }) => {

    const client = wsClients.get(clientId);

    if (client)
        client.send(message);

});


ipcMain.on('send-WSBinaryMessage', (event, { clientId, message }) => {

  const client = wsClients.get(clientId);

  if (client && client.readyState === WebSocket.OPEN)
      client.send(message, { binary: isBinary });

  // wss.clients.forEach(function each(client) {
  //   if (client !== ws && client.readyState === WebSocket.OPEN) {
  //     client.send(data, { binary: isBinary });
  //   }
  // });

});