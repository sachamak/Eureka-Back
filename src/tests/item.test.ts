/** @format */

import request from "supertest";
import mongoose from "mongoose";
import initApp from "../server";
import { Express } from "express";
import userModel from "../models/user_model";
import itemModel from "../models/item_model";
import path from "path";
import fs from "fs";

jest.mock("../services/vision-service", () => ({
  default: {
    getImageAnalysis: jest.fn().mockResolvedValue({
      labels: ["test-label"],
      objects: [
        {
          name: "test-object",
          score: 0.8,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        },
      ],
      texts: [
        {
          text: "test-text",
          confidence: 0.9,
          boundingBox: { x: 0, y: 0, width: 100, height: 50 },
        },
      ],
      logos: [
        {
          description: "test-logo",
          score: 0.95,
          boundingBox: { x: 0, y: 0, width: 100, height: 50 },
        },
      ],
    }),
  },
}));

jest.mock("../services/matching-service", () => ({
  MatchingService: jest.fn().mockResolvedValue([]),
}));

jest.mock("../services/notification.socket-service", () => ({
  emitNotification: jest.fn(),
  initSocket: jest.fn(),
  getIO: jest.fn(),
}));

let app: Express;
let accessToken: string;
let userId: string;
let createdItemId: string;

const createTestImageFile = () => {
  const testDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  const testImagePath = path.join(testDir, "test-image.jpg");
  if (!fs.existsSync(testImagePath)) {
    fs.writeFileSync(testImagePath, Buffer.from("fake-image-data"));
  }
  return testImagePath;
};

beforeAll(async () => {
  app = await initApp();
  await userModel.deleteMany({});
  await itemModel.deleteMany({});

  // Register a test user
  const res = await request(app).post("/auth/register").send({
    email: "test@test.com",
    password: "1234567890",
    userName: "testuser",
    phoneNumber: "0606060606",
  });

  if (res.statusCode !== 200) {
    console.log("Register error:", res.body);
  }
  expect(res.statusCode).toBe(200);

  // Login with the test user
  const loginRes = await request(app).post("/auth/login").send({
    email: "test@test.com",
    password: "1234567890",
  });

  if (loginRes.statusCode !== 200) {
    console.log("Login error:", loginRes.body);
  }
  expect(loginRes.statusCode).toBe(200);
  accessToken = loginRes.body.accessToken;
  userId = loginRes.body._id;
});

afterAll(async () => {
  // Nettoyer le fichier de test
  const testImagePath = path.join(__dirname, "../temp/test-image.jpg");
  if (fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
  }
  const testDir = path.join(__dirname, "../temp");
  if (fs.existsSync(testDir)) {
    fs.rmdirSync(testDir);
  }

  await userModel.deleteMany({});
  await itemModel.deleteMany({});
  await mongoose.connection.close();
});

describe("Item API Tests", () => {
  test("Should create a lost item", async () => {
    const testImagePath = createTestImageFile();

    const res = await request(app)
      .post("/items")
      .set("Authorization", "Bearer " + accessToken)
      .attach("file", testImagePath)
      .field("itemType", "lost")
      .field("description", "Test lost item")
      .field("location", JSON.stringify({ lat: 48.8566, lng: 2.3522 }))
      .field("category", "Electronics")
      .field("colors", JSON.stringify(["red", "black"]))
      .field("condition", "worn")
      .field("material", "plastic")
      .field("date", new Date().toISOString());

    if (res.statusCode !== 201) {
      console.log("Create item error:", res.body || res.text);
    }
    expect(res.statusCode).toBe(201);
    expect(res.body).toBeDefined();
    expect(res.body.itemType).toBe("lost");
    expect(res.body.description).toBe("Test lost item");
    createdItemId = res.body._id;
  });

  test("Should get all items", async () => {
    const res = await request(app).get("/items");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length === 0) {
      console.log("Warning: No items found in database");
    }
  });

  test("Should get all lost items", async () => {
    const res = await request(app).get("/items?itemType=lost");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0].itemType).toBe("lost");
    }
  });

  test("Should get items by user ID", async () => {
    const res = await request(app).get(`/items?userId=${userId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0].userId).toBe(userId);
    }
  });

  test("Should get item by ID", async () => {
    if (!createdItemId) {
      console.log("Skipping test: no createdItemId available");
      return;
    }

    const res = await request(app).get(`/items/${createdItemId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body._id).toBe(createdItemId);
  });

  test("Should mark an item as resolved", async () => {
    if (!createdItemId) {
      console.log("Skipping test: no createdItemId available");
      return;
    }

    const res = await request(app)
      .put(`/items/${createdItemId}/resolve`)
      .set("Authorization", "Bearer " + accessToken)
      .send({
        itemId: createdItemId,
      });

    if (res.statusCode !== 200) {
      console.log("Resolve item error:", res.body || res.text);
    }
    expect(res.statusCode).toBe(200);
    expect(res.body.isResolved).toBe(true);
  });

  test("Should create a found item", async () => {
    const testImagePath = createTestImageFile();

    const res = await request(app)
      .post("/items")
      .set("Authorization", "Bearer " + accessToken)
      .attach("file", testImagePath)
      .field("itemType", "found")
      .field("description", "Test found item")
      .field("location", JSON.stringify({ lat: 48.8566, lng: 2.3522 }))
      .field("category", "Clothing")
      .field("colors", JSON.stringify(["blue", "white"]))
      .field("condition", "new")
      .field("material", "cotton")
      .field("date", new Date().toISOString());

    if (res.statusCode !== 201) {
      console.log("Create found item error:", res.body || res.text);
    }
    expect(res.statusCode).toBe(201);
    expect(res.body).toBeDefined();
    expect(res.body.itemType).toBe("found");
    expect(res.body.description).toBe("Test found item");

    createdItemId = res.body._id;
  });

  test("Should delete an item", async () => {
    if (!createdItemId) {
      console.log("Skipping test: no createdItemId available");
      return;
    }

    const res = await request(app)
      .delete(`/items/${createdItemId}`)
      .set("Authorization", "Bearer " + accessToken);

    if (res.statusCode !== 200) {
      console.log("Delete item error:", res.body || res.text);
    }
    expect(res.statusCode).toBe(200);

    const getRes = await request(app).get(`/items/${createdItemId}`);
    expect(getRes.statusCode).toBe(404);
  });
});
