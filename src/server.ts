import express, { Express } from "express";
const app = express();
import dotenv from "dotenv";
dotenv.config();
import bodyParser from "body-parser";
import mongoose from "mongoose";
import postsRoutes from "./routes/Posts_routes";
import commentsRoutes from "./routes/Comments_routes";
import authRoutes from "./routes/auth_routes";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/posts", postsRoutes);
app.use("/comments", commentsRoutes);
app.use("/auth", authRoutes);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Web Dev 2025 REST API",
      version: "1.0.0",
      description: "REST server including authentication using JWT",
    },
    servers: [{ url: "http://localhost:3000" }],
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
