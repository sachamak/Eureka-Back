/** @format */
import request from "supertest";
import mongoose from "mongoose";
import userModel, { iUser } from "../models/user_model";
import itemModel from "../models/item_model";
import initApp from "../server";
import { Express } from "express";
import jwt from "jsonwebtoken";

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

beforeAll(async () => {
  console.log("Before all tests");
  app = await initApp();
  await userModel.deleteMany();
  await itemModel.deleteMany();
});

afterAll(async () => {
  await userModel.deleteMany();
  await itemModel.deleteMany();
  await mongoose.connection.close();
});

const baseUrl = "/auth";

const testUser = {
  email: "testUser@test.com",
  password: "123456",
  userName: "testUser",
  phoneNumber: "0606060606",
} as iUser & { accessToken?: string; refreshToken?: string };

describe("Auth Tests", () => {
  test("Auth test registration", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe(testUser.email);
    expect(response.body.password).not.toBe(testUser.password);
  });

  test("Auth duplicate email test", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send(testUser);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("User name already exists");
  });

  test("Auth test login - valid", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;
    testUser._id = response.body._id;
  });

  test("Auth test login - invalid password", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({ email: testUser.email, password: "wrong password" });
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("User or password incorrect");
  });

  test("Auth test login - user doesn't exist", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({ email: "wronguser@test.com", password: "123456" });
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("User or password incorrect");
  });

  test("Auth test login - missing environment variables", async () => {
    const originalEnv = { ...process.env };

    delete process.env.TOKEN_SECRET;
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(500);
    expect(response.text).toBe("server error");

    delete process.env.TOKEN_EXPIRATION;
    const response2 = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response2.statusCode).toBe(500);
    expect(response2.text).toBe("server error");

    process.env = originalEnv;
  });

  test("Auth test refresh token valid", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;
  });

  test("Auth test me", async () => {
    const testItem = await itemModel.create({
      userId: testUser._id,
      imageUrl: "http://example.com/test.jpg",
      itemType: "lost",
      description: "Test item for auth",
      location: { lat: 48.8566, lng: 2.3522 },
      date: new Date(),
      category: "Electronics",
      colors: ["red", "black"],
      condition: "worn",
      material: "plastic",
      ownerName: testUser.userName,
      ownerEmail: testUser.email,
      isResolved: false,
    });

    const response = await request(app)
      .get(`/items/${testItem._id}`)
      .set({ authorization: "JWT " + testUser.accessToken });

    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe(testItem._id.toString());
  });

  test("Auth test middleware with missing authorization header", async () => {
    const testItem = await itemModel.create({
      userId: testUser._id,
      imageUrl: "http://example.com/test2.jpg",
      itemType: "found",
      description: "Test item 2",
      location: { lat: 48.8566, lng: 2.3522 },
      date: new Date(),
      category: "Electronics",
      colors: ["blue", "white"],
      condition: "new",
      material: "metal",
      ownerName: testUser.userName,
      ownerEmail: testUser.email,
      isResolved: false,
    });

    const response = await request(app).delete(`/items/${testItem._id}`);

    expect(response.statusCode).toBe(402);
    expect(response.text).toBe("Unauthorized");
  });

  test("Auth test middleware with invalid token format", async () => {
    const testItem = await itemModel.create({
      userId: testUser._id,
      imageUrl: "http://example.com/test3.jpg",
      itemType: "lost",
      description: "Test item 3",
      location: { lat: 48.8566, lng: 2.3522 },
      date: new Date(),
      category: "Clothing",
      colors: ["green"],
      condition: "worn",
      material: "cotton",
      ownerName: testUser.userName,
      ownerEmail: testUser.email,
      isResolved: false,
    });

    const response = await request(app)
      .delete(`/items/${testItem._id}`)
      .set({ authorization: "Invalid" });

    expect(response.statusCode).toBe(403);
    expect(response.text).toBe("Unauthorized");
  });

  test("Auth test middleware with invalid token", async () => {
    const testItem = await itemModel.create({
      userId: testUser._id,
      imageUrl: "http://example.com/test4.jpg",
      itemType: "found",
      description: "Test item 4",
      location: { lat: 48.8566, lng: 2.3522 },
      date: new Date(),
      category: "Books",
      colors: ["black"],
      condition: "new",
      material: "paper",
      ownerName: testUser.userName,
      ownerEmail: testUser.email,
      isResolved: false,
    });

    const response = await request(app)
      .delete(`/items/${testItem._id}`)
      .set({ authorization: "JWT invalidtoken" });

    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Unauthorized");
  });

  test("Auth test refresh token not valid", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: "invalid token" });
    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Unauthorized");
  });

  test("Auth test refresh token missing", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({});
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("refreshToken is required");
  });

  test("Auth test refresh token missing env var", async () => {
    const tokenSecret = process.env.TOKEN_SECRET;
    delete process.env.TOKEN_SECRET;
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(response.statusCode).toBe(500);
    expect(response.text).toBe("server error");
    process.env.TOKEN_SECRET = tokenSecret;
  });

  test("Auth test refresh token user not found", async () => {
    const payload = { _id: new mongoose.Types.ObjectId(), random: 1 };
    const refreshToken = jwt.sign(payload, process.env.TOKEN_SECRET as string, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRATION,
    });
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken });
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("User not found");
  });

  test("Auth test refresh token valid but not found in user refreshToken array", async () => {
    const payload = { _id: testUser._id, random: 1 };
    const refreshToken = jwt.sign(payload, process.env.TOKEN_SECRET as string, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRATION,
    });
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken });
    expect(response.statusCode).toBe(402);
    expect(response.text).toBe("Unauthorized");
  });

  test("Auth test logout valid", async () => {
    const loginRes = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(loginRes.statusCode).toBe(200);
    const freshRefreshToken = loginRes.body.refreshToken;

    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({ refreshToken: freshRefreshToken });
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe("Logged out");
  });

  test("Auth test logout with invalid token", async () => {
    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({ refreshToken: "invalid token" });
    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Unauthorized");
  });

  test("Auth test logout with missing token", async () => {
    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({});
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("refreshToken is required");
  });

  test("Auth test logout with missing env var", async () => {
    const tokenSecret = process.env.TOKEN_SECRET;
    delete process.env.TOKEN_SECRET;
    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({ refreshToken: "some token" });
    expect(response.statusCode).toBe(500);
    expect(response.text).toBe("server error");
    process.env.TOKEN_SECRET = tokenSecret;
  });

  test("Auth test logout with non-existent user", async () => {
    const payload = { _id: new mongoose.Types.ObjectId(), random: 1 };
    const refreshToken = jwt.sign(payload, process.env.TOKEN_SECRET as string, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRATION,
    });
    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({ refreshToken });
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("User not found");
  });

  test("Auth test logout with valid token but not found in user refreshToken array", async () => {
    const payload = { _id: testUser._id, random: 1 };
    const refreshToken = jwt.sign(payload, process.env.TOKEN_SECRET as string, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRATION,
    });
    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({ refreshToken });
    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Unauthorized");
  });

  test("Refresh token timeout", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;
    await new Promise((r) => setTimeout(r, 6000));

    const testItem = await itemModel.create({
      userId: testUser._id,
      imageUrl: "http://example.com/timeout-test.jpg",
      itemType: "lost",
      description: "Timeout test item",
      location: { lat: 48.8566, lng: 2.3522 },
      date: new Date(),
      category: "Test",
      colors: ["red"],
      condition: "new",
      material: "test",
      ownerName: testUser.userName,
      ownerEmail: testUser.email,
      isResolved: false,
    });

    const response2 = await request(app)
      .delete(`/items/${testItem._id}`)
      .set({ authorization: "JWT " + testUser.accessToken });
    expect(response2.statusCode).toBe(401);

    const response3 = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(response3.statusCode).toBe(200);
    testUser.accessToken = response3.body.accessToken;
    testUser.refreshToken = response3.body.refreshToken;

    const response4 = await request(app)
      .get(`/items/${testItem._id}`)
      .set({ authorization: "JWT " + testUser.accessToken });
    expect(response4.statusCode).toBe(200);
  }, 10000);

  test("wrong test post fall middleware", async () => {
    const tokenSecret = process.env.TOKEN_SECRET;
    delete process.env.TOKEN_SECRET;

    const testItem = await itemModel.create({
      userId: testUser._id,
      imageUrl: "http://example.com/env-test.jpg",
      itemType: "found",
      description: "Env test item",
      location: { lat: 48.8566, lng: 2.3522 },
      date: new Date(),
      category: "Test",
      colors: ["blue"],
      condition: "worn",
      material: "test",
      ownerName: testUser.userName,
      ownerEmail: testUser.email,
      isResolved: false,
    });

    const response4 = await request(app)
      .delete(`/items/${testItem._id}`)
      .set({ authorization: "JWT " + testUser.accessToken });
    expect(response4.statusCode).toBe(500);
    process.env.TOKEN_SECRET = tokenSecret;
  });

  test("Get all users", async () => {
    const response = await request(app).get(baseUrl);
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
  });

  test("Get user by ID", async () => {
    const newUser = await userModel.create({
      email: "getusertest@test.com",
      password: "123456",
      userName: "getUserTest",
      phoneNumber: "0606060606",
    });

    const response = await request(app).get(baseUrl + "/" + newUser._id);
    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe(newUser.email);
    expect(response.body.userName).toBe(newUser.userName);
  });

  test("Get user by non-existent ID", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app).get(baseUrl + "/" + nonExistentId);
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("User not found");
  });

  test("Get user with invalid ID format", async () => {
    const response = await request(app).get(baseUrl + "/invalidid");
    expect(response.statusCode).toBe(400);
  });

  test("Update user", async () => {
    const newUser = await userModel.create({
      email: "updatetest@test.com",
      password: "123456",
      userName: "updateTest",
      phoneNumber: "0606060606",
    });

    const response = await request(app)
      .put(baseUrl + "/" + newUser._id)
      .send({ email: "updated@test.com" });

    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe("updated@test.com");
  });

  test("Update user password", async () => {
    const newUser = await userModel.create({
      email: "passwordupdate@test.com",
      password: "123456",
      userName: "passwordUpdate",
      phoneNumber: "0606060606",
    });

    const response = await request(app)
      .put(baseUrl + "/" + newUser._id)
      .send({ password: "newpassword" });

    expect(response.statusCode).toBe(200);

    const updatedUser = await userModel.findById(newUser._id);
    expect(updatedUser?.password).not.toBe("newpassword");
  });

  test("Update user with non-existent ID", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .put(baseUrl + "/" + nonExistentId)
      .send({ email: "updated@test.com" });
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("User not found");
  });

  test("Update user with existing username", async () => {
    const user1 = await userModel.create({
      email: "user1update@test.com",
      password: "123456",
      userName: "user1update",
      phoneNumber: "0606060606",
    });

    await userModel.create({
      email: "user2update@test.com",
      password: "123456",
      userName: "user2update",
      phoneNumber: "0606060606",
    });

    const response = await request(app)
      .put(baseUrl + "/" + user1._id)
      .send({ userName: "user2update" });

    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("User name already exists");
  });

  test("Update user with invalid ID format", async () => {
    const response = await request(app)
      .put(baseUrl + "/invalidid")
      .send({ email: "updated@test.com" });
    expect(response.statusCode).toBe(400);
  });

  test("Delete user", async () => {
    const newUser = await userModel.create({
      email: "todelete@test.com",
      password: "123456",
      userName: "userToDelete",
      phoneNumber: "0606060606",
    });

    const response = await request(app).delete(baseUrl + "/" + newUser._id);
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe("User deleted");

    const deletedUser = await userModel.findById(newUser._id);
    expect(deletedUser).toBeNull();
  });

  test("Delete non-existent user", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app).delete(baseUrl + "/" + nonExistentId);
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("User not found");
  });

  test("delete user fail", async () => {
    const response = await request(app).delete(baseUrl + "/123");
    expect(response.statusCode).not.toBe(200);
  });

  test("Google sign-in with invalid token", async () => {
    const response = await request(app)
      .post(baseUrl + "/google")
      .send({ credential: "invalid_token" });

    expect(response.statusCode).toBe(400);
  });
});
