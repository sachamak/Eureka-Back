/** @format */

import request from "supertest";
import mongoose from "mongoose";
import initApp from "../server";
import { Express } from "express";
import userModel from "../models/user_model";
import itemModel from "../models/item_model";
import path from "path";

let app: Express;
let accessToken: string;
let refreshToken: string;
let userId: string;
let createdItemId: string;

beforeAll(async () => {
  app = await initApp();
  await userModel.deleteMany({});
  await itemModel.deleteMany({});

  const res = await request(app).post("/auth/register").send({
    email: "test@test.com",
    password: "1234567890",
    userName: "testuser",
  });
  expect(res.statusCode).toBe(200);

  const loginRes = await request(app).post("/auth/login").send({
    email: "test@test.com",
    password: "1234567890",
  });
  expect(loginRes.statusCode).toBe(200);
  accessToken = loginRes.body.accessToken;
  refreshToken = loginRes.body.refreshToken;
  userId = loginRes.body._id;
  expect(accessToken).toBeDefined();
  expect(refreshToken).toBeDefined();
  expect(userId).toBeDefined();
});

afterAll(async () => {
  await userModel.deleteMany({});
  await itemModel.deleteMany({});
  await mongoose.connection.close();
});

describe("Item API Tests", () => {
  test("Create a lost item", async () => {
    const testImagePath = path.join(__dirname, "test-image.png");
      const res = await request(app)
        .post("/items")
        .set("Authorization", "Bearer " + accessToken)
        .field("userId", userId)
        .field("itemType", "lost")
        .field("description", "Test lost item")
        .field("location", "Test location")
        .field("category", "Test category")
        .attach("file", testImagePath);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toBeDefined();
      expect(res.body.itemType).toBe("lost");
      expect(res.body.description).toBe("Test lost item");
      createdItemId = res.body._id;
  });

  test("get all items", async () => {
    const res = await request(app).get("/items");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("get all lost items", async () => {
    const res = await request(app).get("/items?itemType=lost");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].itemType).toBe("lost");
  });

  test("get items by user ID", async () => {
    const res = await request(app).get(`/items?userId=${userId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].userId).toBe(userId);
  });

  test("get item by ID", async () => {
    const res = await request(app).get(`/items/${createdItemId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body._id).toBe(createdItemId);
  });

  test("update an item", async () => {
    const res = await request(app)
      .put(`/items/${createdItemId}`)
      .set("Authorization", "Bearer " + accessToken)
      .send({
        userId: userId,
        description: "Updated description",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.description).toBe("Updated description");
  });

  test("Create a found item", async () => {
    const testImagePath = path.join(__dirname,"test-image.png");
      const res = await request(app)
        .post("/items")
        .set("Authorization", "Bearer " + accessToken)
        .field("userId", userId)
        .field("itemType", "found")
        .field("description", "Test found item")
        .field("location", "Test location 2")
        .field("category", "Test category")
        .attach("file", testImagePath);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toBeDefined();
      expect(res.body.itemType).toBe("found");
      expect(res.body.description).toBe("Test found item");
      createdItemId = res.body._id;
  });

  test("Should delete an item", async () => {
    const res = await request(app)
      .delete(`/items/${createdItemId}`)
      .set("Authorization", "Bearer " + accessToken)
      .send({
        userId: userId,
      });

    expect(res.statusCode).toBe(200);

    const getRes = await request(app).get(`/items/${createdItemId}`);
    expect(getRes.statusCode).toBe(404);
  });
});
