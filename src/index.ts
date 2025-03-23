/** @format */

import initApp from "./server";
import http from "http";
import https from "https";
import fs from "fs";

const port = process.env.PORT;

initApp().then((app) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("development");
    http.createServer(app).listen(port);
  } else {
    const options = {
      key: fs.readFileSync("./client-key.pem"),
      cert: fs.readFileSync("./client-cert.pem"),
    };
    https.createServer(options, app).listen(port);
  }
});
