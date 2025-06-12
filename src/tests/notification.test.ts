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
let userId1: string;
let userId2: string;
let item1Id: string;
let item2Id: string;
let matchId: string;
let notificationId1: string;
let notificationId2: string;

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
      user1Confirmed: false,
      user2Confirmed: false,
      matchScore: 85,
    });
    matchId = match._id!.toString();

    const [notification1, notification2] = await Promise.all([
      notificationModel.create({
        type: "MATCH_FOUND",
        title: "Potential Match Found!",
        message: "We found a potential match for your lost item!",
        userId: userId1,
        matchId: matchId,
        isRead: false,
      }),
      notificationModel.create({
        type: "MATCH_FOUND",
        title: "Potential Match Found!",
        message: "We found a potential match for your found item!",
        userId: userId2,
        matchId: matchId,
        isRead: false,
      }),
    ]);

    notificationId1 = notification1._id!.toString();
    notificationId2 = notification2._id!.toString();
    expect(notificationId1).toBeDefined();
    expect(notificationId2).toBeDefined();
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

describe("Notification API Tests", () => {
  test("Should get all notifications for a user", async () => {
    const res = await request(app)
      .get(`/notification?userId=${userId1}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].userId).toBe(userId1);
    expect(res.body.data[0].matchId).toBe(matchId);
  });

  test("Should return error when userId is missing", async () => {
    const res = await request(app)
      .get("/notification")
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("User ID is required");
  });

  test("Should get notification by ID", async () => {
    const res = await request(app)
      .get(`/notification/${notificationId1}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data._id).toBe(notificationId1);
    expect(res.body.data.userId).toBe(userId1);
    expect(res.body.data.isRead).toBe(false);
  });

  test("Should return 404 for non-existent notification", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/notification/${fakeId}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Notification not found");
  });

  test("Should mark notification as read", async () => {
    const res = await request(app)
      .put(`/notification/${notificationId1}/read`)
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data._id).toBe(notificationId1);
    expect(res.body.data.isRead).toBe(true);
  });

  test("Should return 404 when marking non-existent notification as read", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .put(`/notification/${fakeId}/read`)
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Notification not found");
  });

  test("Should mark all notifications as read for a user", async () => {
    await notificationModel.create({
      type: "MATCH_FOUND",
      title: "Another Match Found!",
      message: `Another potential match for your item!`,
      userId: userId1,
      matchId: matchId,
      isRead: false,
    });

    const res = await request(app)
      .put("/notification/read-all")
      .set("Authorization", "Bearer " + accessToken)
      .send({ userId: userId1 });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("All notifications marked as read");
    expect(res.body.modifiedCount).toBeGreaterThan(0);

    const notifications = await notificationModel.find({ userId: userId1 });
    notifications.forEach((notification) => {
      expect(notification.isRead).toBe(true);
    });
  });

  test("Should return error when userId is missing for mark all as read", async () => {
    const res = await request(app)
      .put("/notification/read-all")
      .set("Authorization", "Bearer " + accessToken)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("User ID is required");
  });

  test("Should delete notification by ID", async () => {
    const tempNotification = await notificationModel.create({
      type: "MATCH_FOUND",
      title: "Temp notification",
      message: `Temporary notification for deletion test`,
      userId: userId1,
      matchId: matchId,
      isRead: false,
    });

    const res = await request(app)
      .delete(`/notification/${tempNotification._id}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Notification deleted successfully");

    const deletedNotification = await notificationModel.findById(
      tempNotification._id
    );
    expect(deletedNotification).toBeNull();
  });

  test("Should return 404 when deleting non-existent notification", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/notification/${fakeId}`)
      .set("Authorization", "Bearer " + accessToken);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Notification not found");
  });

  test("Should return 401 when accessing notifications without auth token", async () => {
    const res = await request(app).get(`/notification?userId=${userId1}`);

    expect(res.statusCode).toBe(402);
  });

  test("Should return 401 when accessing notifications with invalid token", async () => {
    const res = await request(app)
      .get(`/notification?userId=${userId1}`)
      .set("Authorization", "Bearer invalidtoken");

    expect(res.statusCode).toBe(401);
  });
});
