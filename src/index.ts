/** @format */
import initApp from "./server";
import http from "http";
import https from "https";
import fs from "fs";
import { initSocket } from "./services/notification.socket-service";
import path from "path";

const port = process.env.PORT;

initApp().then((app) => {
  let server;
  if (process.env.NODE_ENV !== "production") {
    console.log("development");
    server = http.createServer(app);
  } else {
    const certPath = path.join(__dirname, "cert", "CSB.crt");
    const keyPath = path.join(__dirname, "cert", "myserver.key");
    const options = {
     cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };
    server = https.createServer(options, app);
  }

  // Initialize Socket.IO
  initSocket(server);

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
