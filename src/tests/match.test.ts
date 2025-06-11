/** @format */

import request from "supertest";
import mongoose from "mongoose";
import initApp from "../server";
import { Express } from "express";
import userModel from "../models/user_model";
import itemModel from "../models/item_model";
import matchModel from "../models/match_model";
import notificationModel from "../models/notification_model";

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
let accessToken: string;
let userId1: string;
let userId2: string;
let item1Id: string;
let item2Id: string;
let matchId: string;
let notificationId: string;

beforeAll(async () => {
  try {
    app = await initApp();

    await Promise.all([
      userModel.deleteMany({}),
      itemModel.deleteMany({}),
      matchModel.deleteMany({}),
      notificationModel.deleteMany({}),
    ]);

    const [user1Res, user2Res] = await Promise.all([
      request(app).post("/auth/register").send({
        email: "user1@test.com",
        password: "1234567890",
        userName: "testuser1",
        phoneNumber: "0606060606",
      }),
      request(app).post("/auth/register").send({
        email: "user2@test.com",
        password: "1234567890",
        userName: "testuser2",
        phoneNumber: "0606060606",
      }),
    ]);

    expect(user1Res.statusCode).toBe(200);
    expect(user2Res.statusCode).toBe(200);
    userId1 = user1Res.body._id;
    userId2 = user2Res.body._id;

    const loginRes = await request(app).post("/auth/login").send({
      email: "user1@test.com",
      password: "1234567890",
    });
    expect(loginRes.statusCode).toBe(200);
    accessToken = loginRes.body.accessToken;

    const [item1, item2] = await Promise.all([
      itemModel.create({
        userId: userId1,
        imageUrl: "http://example.com/test1.jpg",
        itemType: "lost",
        description: "Test lost item 1",
        location: { lat: 48.8566, lng: 2.3522 },
        date: new Date(),
        category: "Electronics",
        colors: ["red", "black"],
        condition: "worn",
        material: "plastic",
        ownerName: "testuser1",
        ownerEmail: "user1@test.com",
        isResolved: false,
      }),
      itemModel.create({
        userId: userId2,
        imageUrl: "http://example.com/test2.jpg",
        itemType: "found",
        description: "Test found item 2",
        location: { lat: 48.8566, lng: 2.3522 },
        date: new Date(),
        category: "Electronics",
        colors: ["red", "black"],
        condition: "new",
        material: "metal",
        ownerName: "testuser2",
        ownerEmail: "user2@test.com",
        isResolved: false,
      }),
    ]);

    item1Id = item1._id!.toString();
    item2Id = item2._id!.toString();

    const match = await matchModel.create({
      item1Id: item1Id,
      userId1: userId1,
      item2Id: item2Id,
      userId2: userId2,
      matchScore: 85,
    });
    matchId = match._id!.toString();

    const notification = await notificationModel.create({
      type: "MATCH_FOUND",
      title: "Potential Match Found!",
      message: "We found a potential match for your item!",
      userId: userId1,
      matchId: matchId,
      isRead: false,
    });
    notificationId = notification._id!.toString();
  } catch (error) {
    console.error("BeforeAll setup error:", error);
    throw error;
  }
}, 15000);

afterAll(async () => {
  try {
    await Promise.all([
      userModel.deleteMany({}),
      itemModel.deleteMany({}),
      matchModel.deleteMany({}),
      notificationModel.deleteMany({}),
    ]);
    await mongoose.connection.close();
  } catch (error) {
    console.error("AfterAll cleanup error:", error);
  }
}, 10000);

describe("Match API Tests", () => {
  test("Should get all matches by user ID", async () => {
    const res = await request(app)
      .get(`/match?Id=${userId1}`)
      .set("Authorization", "Bearer " + accessToken);

    if (res.statusCode !== 200) {
      console.log("Get matches error:", res.body || res.text);
    }
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].userId1).toBe(userId1);
    expect(res.body[0].matchScore).toBe(85);
  });

  test("Should get all matches by user ID (second user)", async () => {
    const res = await request(app)
      .get(`/match?Id=${userId2}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].userId2).toBe(userId2);
  });

  test("Should return 400 when userId is missing", async () => {
    const res = await request(app)
      .get("/match")
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(400);
    expect(res.text).toBe("User name is required");
  });

  test("Should get match by ID", async () => {
    const res = await request(app)
      .get(`/match/${matchId}`)
      .set("Authorization", "Bearer " + accessToken);

    if (res.statusCode !== 200) {
      console.log("Get match by ID error:", res.body || res.text);
    }
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body._id).toBe(matchId);
    expect(res.body.item1Id).toBe(item1Id);
    expect(res.body.item2Id).toBe(item2Id);
    expect(res.body.matchScore).toBe(85);
  });

  test("Should return 404 when match ID doesn't exist", async () => {
    const fakeMatchId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/match/${fakeMatchId}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(404);
    expect(res.text).toBe("Match not found");
  });

  test("Should return 500 when match ID is invalid", async () => {
    const res = await request(app)
      .get("/match/invalid-id")
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(500);
  });

  test("Should delete a match and its notifications", async () => {
    const notificationBefore = await notificationModel.findById(notificationId);
    expect(notificationBefore).not.toBeNull();

    const res = await request(app)
      .delete(`/match/${matchId}`)
      .set("Authorization", "Bearer " + accessToken);

    if (res.statusCode !== 200) {
      console.log("Delete match error:", res.body || res.text);
    }

    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("Match deleted successfully");

    const deletedMatch = await matchModel.findById(matchId);
    expect(deletedMatch).toBeNull();

    const deletedNotification =
      await notificationModel.findById(notificationId);
    expect(deletedNotification).toBeNull();
  });

  test("Should return 404 when trying to delete non-existent match", async () => {
    const fakeMatchId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/match/${fakeMatchId}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(404);
    expect(res.text).toBe("Match not found");
  });

  test("Should require authentication for all match endpoints", async () => {
    const resGet = await request(app).get(`/match?Id=${userId1}`);
    expect([401, 402, 403]).toContain(resGet.statusCode);

    const resGetById = await request(app).get(`/match/${matchId}`);
    expect([401, 402, 403]).toContain(resGetById.statusCode);

    const resDelete = await request(app).delete(`/match/${matchId}`);
    expect([401, 402, 403]).toContain(resDelete.statusCode);
  });
});
