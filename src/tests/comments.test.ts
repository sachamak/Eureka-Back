/** @format */

import request from "supertest";
import mongoose from "mongoose";
import CommentModel from "../models/comments_model";
import initApp from "../server";
import { Express } from "express";
import userModel, { iUser } from "../models/user_model";

let app: Express;
type User = iUser & { accessToken?: string };
const testUser: User = {
  email: "user1@test.com",
  password: "123456",
};
beforeAll(async () => {
  console.log("Before all tests");
  app = await initApp();
  await CommentModel.deleteMany();
  await userModel.deleteMany();
  await request(app).post("/auth/register").send(testUser);
  const response = await request(app).post("/auth/login").send(testUser);
  testUser.accessToken = response.body.accessToken;
  testUser._id = response.body._id;
  expect(testUser.accessToken).toBeDefined();
  expect(testUser._id).toBeDefined();
});

afterAll(async () => {
  console.log("after all tests");
  await mongoose.connection.close();
});
let commentId = "";
import testComment from "./CommentsTestsItems/test_comment.json";
import testCommentUpdate from "./CommentsTestsItems/test_comment_update.json";
import invalidComment from "./CommentsTestsItems/test_invalid_comment.json";
import path from "path";
describe("Comment test suite", () => {
  test("Comment test get all post", async () => {
    const response = await request(app).get("/comments");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });

  test("Test Adding new comment", async () => {
    const filePath = path.join(__dirname, "PostTestsItems", "avatar.png");

    const response1 = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + testUser.accessToken })
      .field("title", "Test Post")
      .field("content", "This is a test post")
      .attach("image", filePath);
    console.log(response1.body);
    const response = await request(app)
      .post("/comments")
      .set({ authorization: "JWT " + testUser.accessToken })
      .send({ ...testComment, postId: response1.body._id });
    expect(response.status).toBe(201);
    expect(response.body.content).toBe(testComment.content);
    expect(response.body.owner).toBe(testUser._id);
    commentId = response.body._id;
    const postResponse = await request(app)
      .get(`/posts/${response1.body._id}`)
      .set({ authorization: "JWT " + testUser.accessToken });
    expect(postResponse.status).toBe(200);
  });

  test("Test Adding invalid comment", async () => {
    const response = await request(app).post("/comments").send(invalidComment);
    expect(response.status).not.toBe(201);
  });

  test("Test get all comments after adding", async () => {
    const response = await request(app).get("/comments");
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
  });

  test("Test get comment by owner", async () => {
    const response = await request(app).get("/comments?owner=" + testUser._id);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].owner).toBe(testUser._id);
  });

  test("Test get comments by owner fail", async () => {
    const response = await request(app).get(
      "/comments?owner=" + testComment.owner + "1"
    );
    expect(response.status).not.toBe(201);
  });

  test("Test get comments by id", async () => {
    const response = await request(app).get("/comments/" + commentId);
    expect(response.status).toBe(200);
    expect(response.body.owner).toBe(testUser._id);
    expect(response.body.content).toBe("test content");
    expect(response.body._id).toBe(commentId);
  });

  const invalidCommentId = new mongoose.Types.ObjectId(
    "675ad3702a7e6e3b1af92e8d"
  );

  test("Test get comment by id fail", async () => {
    const response = await request(app).get("/comments/" + invalidCommentId);
    expect(response.status).not.toBe(200);
  });

  test("Test get comment by id fail", async () => {
    const response = await request(app).get("/comments/" + "fff");
    expect(response.status).not.toBe(200);
  });

  test("Test Update comment by id", async () => {
    const response = await request(app)
      .put("/comments/" + commentId)
      .set({ authorization: "JWT " + testUser.accessToken })
      .send(testCommentUpdate);
    expect(response.status).toBe(200);
    expect(response.body.content).toBe(testCommentUpdate.content);
    expect(response.body.owner).toBe(testCommentUpdate.owner);
  });

  test("Test delete comment by id", async () => {
    const response = await request(app)
      .delete("/comments/" + commentId)
      .set({ authorization: "JWT " + testUser.accessToken });
    expect(response.statusCode).toBe(200);

    const responseGet = await request(app).get("/comments/" + commentId);
    expect(responseGet.statusCode).toBe(404);
  });

  test("Test Update comment by id fail", async () => {
    const response = await request(app)
      .put("/comments/" + commentId + 1)
      .send(testCommentUpdate);
    expect(response.status).not.toBe(200);
  });

  test("Test Delete Comment by id fail", async () => {
    const response = await request(app)
      .delete("/posts/" + commentId + 1)
      .set({ authorization: "JWT " + testUser.accessToken });
    expect(response.status).not.toBe(200);
  });
});
