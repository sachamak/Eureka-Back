/** @format */

import express, { Express } from "express";
const app = express();
import dotenv from "dotenv";
dotenv.config();
import bodyParser from "body-parser";
import mongoose from "mongoose";
import authRoutes from "./routes/auth_routes";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import fileRoutes from "./routes/file_routes";
import itemRoutes from "./routes/item_routes";
import matchRoutes from "./routes/match_routes";
import notificationRoutes from "./routes/notification_routes";
import cors from "cors";
//import path from "path";


app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Credentials", "true");

  next();
});

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3002"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/auth", authRoutes);
app.use("/file", fileRoutes);
app.use("/items", itemRoutes);
app.use("/match", matchRoutes);
app.use("/notification", notificationRoutes);
app.use("/public", express.static("public"));
/*
const frontPath = path.resolve("front");
app.use(express.static(frontPath));

app.get("*", (req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/posts") ||
    req.path.startsWith("/auth") ||
    req.path.startsWith("/file")
  ) {
    return next();
  }

  res.sendFile(path.join(frontPath, "index.html"), (err) => {
    if (err) {
      res.status(500).send("Erreur serveur");
    }
  });
});
*/

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Web Dev 2025 REST API",
      version: "1.0.0",
      description: "REST server including authentication using JWT",
    },
    servers: [
      { url: process.env.DOMAIN_BASE },
      { url: "https://10.10.246.118" },
      { url: "http://10.10.246.118" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};
const specs = swaggerJsDoc(options);
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

const initApp = () => {
  return new Promise<Express>((resolve, reject) => {
    const db = mongoose.connection;
    db.on("error", (error) => console.error(error));
    db.once("open", () => console.log("Connected to Database"));
    if (process.env.DB_CONNECTION === undefined) {
      console.log("Please add a valid DB_CONNECTION to your .env file");
      reject();
    } else {
      mongoose.connect(process.env.DB_CONNECTION).then(() => {
        console.log("initApp Finished");
        resolve(app);
      });
    }
  });
};

export default initApp;
