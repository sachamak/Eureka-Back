/** @format */

import request from "supertest";
import mongoose from "mongoose";
import userModel, { iUser } from "../models/user_model";
import initApp from "../server";
import { Express } from "express";
import jwt from "jsonwebtoken";

let app: Express;

beforeAll(async () => {
  console.log("Before all tests");
  app = await initApp();
  await userModel.deleteMany();
});

afterAll(async () => {
  console.log("after all tests");
  await mongoose.connection.close();
});
const baseUrl = "/auth";

type User = iUser & { accessToken?: string; refreshToken?: string };

const testUser: User = {
  email: "user1@test.com",
  password: "123456",
  userName: "User1",
};

describe("Auth Tests", () => {
  test("Auth test registration", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send(testUser);
    expect(response.statusCode).toBe(200);
  });

  test("Auth test registration with invalid data", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send({ email: "invalid" });
    expect(response.statusCode).toBe(400);
  });

  test("Auth test registration exist", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send(testUser);
    expect(response.statusCode).not.toBe(200);
  });

  test("Auth test registration with existing username", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send({
        email: "different@test.com",
        password: "123456",
        userName: "User1",
      });
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("User name already exists");
  });

  test("Auth test registration with existing email", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send({
        email: "user1@test.com",
        password: "123456",
        userName: "DifferentUser",
      });
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("email already exists");
  });

  test("Auth test login", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;
    testUser._id = response.body._id;
    expect(response.body._id).toBeDefined();
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });

  test("Auth test login wrong email", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({
        email: "wrong email",
        password: testUser.password,
      });
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("User or password incorrect");
  });

  test("Auth test login wrong password", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({
        email: testUser.email,
        password: "wrong password",
      });
    expect(response.statusCode).not.toBe(200);
    expect(response.text).toBe("User or password incorrect");
  });

  test("Auth test login wrong token", async () => {
    const tokenSecret = process.env.TOKEN_SECRET;
    delete process.env.TOKEN_SECRET;
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(500);
    expect(response.text).toBe("server error");
    process.env.TOKEN_SECRET = tokenSecret;
  });

  test("Auth test me", async () => {
    const response = await request(app).post("/posts").send({
      title: "test title",
      content: "test content",
      owner: "test owner",
    });
    expect(response.statusCode).not.toBe(201);
    const response2 = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + testUser.accessToken })
      .send({
        title: "test title",
        content: "test content",
        owner: testUser.userName,
      });
    expect(response2.statusCode).toBe(201);
    expect(response2.body.title).toBe("test title");
    expect(response2.body.content).toBe("test content");
    expect(response2.body.owner).toBe(testUser.userName);
  });

  test("Auth test middleware with missing authorization header", async () => {
    const response = await request(app).post("/posts").send({
      title: "test title",
      content: "test content",
      owner: testUser.userName,
    });
    expect(response.statusCode).toBe(402);
    expect(response.text).toBe("Unauthorized");
  });

  test("Auth test middleware with invalid token format", async () => {
    const response = await request(app)
      .post("/posts")
      .set({ authorization: "Invalid" })
      .send({
        title: "test title",
        content: "test content",
        owner: testUser.userName,
      });
    expect(response.statusCode).toBe(403);
    expect(response.text).toBe("Unauthorized");
  });

  test("Auth test middleware with invalid token", async () => {
    const response = await request(app)
      .post("/posts")
      .set({ authorization: "JWT invalidtoken" })
      .send({
        title: "test title",
        content: "test content",
        owner: testUser.userName,
      });
    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Unauthorized");
  });

  test("Auth test refresh wrong token", async () => {
    const tokenSecret = process.env.TOKEN_SECRET;
    delete process.env.TOKEN_SECRET;
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(response.statusCode).toBe(500);
    expect(response.text).toBe("server error");
    process.env.TOKEN_SECRET = tokenSecret;
  });

  test("Refresh Token", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;
  });

  test("Refresh Token", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;
  });

  test("No Refresh Token", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send();
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("refreshToken is required");
  });

  test("Refresh token with non-existent user", async () => {
    // Create token with non-existent user ID
    const nonExistentId = new mongoose.Types.ObjectId();
    const fakeToken = jwt.sign(
      { _id: nonExistentId.toString() },
      process.env.TOKEN_SECRET || "default_secret"
    );

    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: fakeToken });

    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("User not found");
  });

  test("logout without refresh token", async () => {
    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({});
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("refreshToken is required");
  });

  test("Auth test logout wrong token", async () => {
    const tokenSecret = process.env.TOKEN_SECRET;
    delete process.env.TOKEN_SECRET;
    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({ refreshToken: testUser.refreshToken });
    expect(response.statusCode).toBe(500);
    expect(response.text).toBe("server error");
    process.env.TOKEN_SECRET = tokenSecret;
  });

  test("logout with invalid refresh token", async () => {
    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({ refreshToken: "invalid" });
    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Unauthorized");
  });

  test("Logout with non-existent user", async () => {
    // Create token with non-existent user ID
    const nonExistentId = new mongoose.Types.ObjectId();
    const fakeToken = jwt.sign(
      { _id: nonExistentId.toString() },
      process.env.TOKEN_SECRET || "default_secret"
    );

    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({ refreshToken: fakeToken });

    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("User not found");
  });

  test("Refresh token invalid token", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: "invalid" });
    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Unauthorized");
  });

  test("invalid refresh token", async () => {
    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({ refreshToken: testUser.refreshToken });
    expect(response.statusCode).toBe(200);
    const response2 = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(response2.statusCode).not.toBe(200);
  });

  test("Refresh token multiple times", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;
    const response2 = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(response2.statusCode).toBe(200);
    const newRefreshToken = response2.body.refreshToken;
    const response3 = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(response3.statusCode).toBe(402);
    const response4 = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: newRefreshToken });
    expect(response4.statusCode).not.toBe(200);
  });

  jest.setTimeout(10000);
  test("Refresh token timeout", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;
    await new Promise((r) => setTimeout(r, 6000));
    const response2 = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + testUser.accessToken })
      .send({
        title: "test title",
        content: "test content",
        owner: testUser._id,
      });
    expect(response2.statusCode).toBe(401);
    const response3 = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: testUser.refreshToken });
    expect(response3.statusCode).toBe(200);
    testUser.accessToken = response3.body.accessToken;
    testUser.refreshToken = response3.body.refreshToken;
    const response4 = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + testUser.accessToken })
      .send({
        title: "test title",
        content: "test content",
        owner: testUser._id,
      });
    expect(response4.statusCode).toBe(201);
  });

  test("wrong test post fall middleware", async () => {
    const tokenSecret = process.env.TOKEN_SECRET;
    delete process.env.TOKEN_SECRET;
    const response4 = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + testUser.accessToken })
      .send({
        title: "test title",
        content: "test content",
        owner: testUser._id,
      });
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
      email: "test@test.com",
      password: "123456",
      userName: "test",
    });
    const response = await request(app).get(baseUrl + "/" + newUser._id);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("email", "test@test.com");
  });

  test("Get non-existent user by ID", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app).get(baseUrl + "/" + nonExistentId);
    expect(response.statusCode).toBe(404);
  });

  test("Get user with invalid ID format", async () => {
    const response = await request(app).get(baseUrl + "/invalidid");
    expect(response.statusCode).toBe(400);
  });

  test("Update user", async () => {
    const newUser = await userModel.create({
      email: "email@test.com",
      password: "123456",
      userName: "test2",
    });
    const response = await request(app)
      .put(baseUrl + "/" + newUser._id)
      .send({ email: "updated@test.com" });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("email", "updated@test.com");
  });

  test("Update user password", async () => {
    const newUser = await userModel.create({
      email: "passwordtest@test.com",
      password: "123456",
      userName: "passwordtest",
    });
    const response = await request(app)
      .put(baseUrl + "/" + newUser._id)
      .send({ password: "newpassword" });
    expect(response.statusCode).toBe(200);

    const loginResponse = await request(app)
      .post(baseUrl + "/login")
      .send({
        email: "passwordtest@test.com",
        password: "newpassword",
      });
    expect(loginResponse.statusCode).toBe(200);
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
    });

    await userModel.create({
      email: "user2update@test.com",
      password: "123456",
      userName: "user2update",
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

describe("Edge Cases and Error Handling", () => {
  test("Get all users with database error", async () => {
    jest.spyOn(userModel, "find").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app).get(baseUrl);
    expect(response.statusCode).toBe(400);
  });

  test("Get user by ID with database error", async () => {
    jest.spyOn(userModel, "findById").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app).get(
      baseUrl + "/" + new mongoose.Types.ObjectId()
    );
    expect(response.statusCode).toBe(400);
  });

  test("Update user with database error", async () => {
    jest.spyOn(userModel, "findById").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .put(baseUrl + "/" + new mongoose.Types.ObjectId())
      .send({ email: "test@error.com" });

    expect(response.statusCode).toBe(400);
  });

  test("Delete user with database error", async () => {
    jest.spyOn(userModel, "findById").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app).delete(
      baseUrl + "/" + new mongoose.Types.ObjectId()
    );
    expect(response.statusCode).toBe(400);
  });
});
