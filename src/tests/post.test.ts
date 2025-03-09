import request from "supertest";
import mongoose from "mongoose";
import postModel from "../models/posts_model";
import initApp from "../server";
import { Express } from "express";
import userModel, { iUser } from "../models/user_model";
import testPost from "./PostTestsItems/test_post.json";
import testPostUpdate from "./PostTestsItems/test_post_update.json";
import invalidPost from "./PostTestsItems/test_invalid_post.json";
import path from "path";


let app: Express;
type User = iUser & { accessToken?: string };
const testUser: User = {
  email: "user1@test.com",
  password: "123456",
};
beforeAll(async () => {
  console.log("Before all tests");
  app = await initApp();
  await postModel.deleteMany();
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
let postId = "";
let postId1 = "";
  
  test("Post test get all post", async () => {
    const response = await request(app).get("/posts");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });
  describe("Post test suite", () => {
    test("Create post with image", async () => {
      const filePath = path.join(__dirname, "PostTestsItems", "avatar.png");
  
      const response = await request(app)
        .post("/posts")
        .set({ authorization: "JWT " + testUser.accessToken })
        .field("title", "Test Post")
        .field("content", "This is a test post")
        .attach("file", filePath);
        postId1 = response.body._id;
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("image");
    });

    test("Update post with new image", async () => {
      const filePath = path.join(__dirname, "PostTestsItems", "avatar1.jpg");
  
      const response = await request(app)
        .put(`/posts/${postId1}`)
        .set({ authorization: "JWT " + testUser.accessToken })
        .field("title", "Updated Post Title")
        .field("content", "Updated content")
        .attach("file", filePath);
  
      expect(response.statusCode).toEqual(200);
      expect(response.body.title).toEqual("Updated Post Title");
      expect(response.body.content).toEqual("Updated content");
      expect(response.body.image).toMatch(/public\/\d+\.\w+/);
    });

  test("Test Adding new post", async () => {
    const response = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + testUser.accessToken })
      .send(testPost);
    expect(response.status).toBe(201);
    expect(response.body.title).toBe(testPost.title);
    expect(response.body.content).toBe(testPost.content);
    expect(response.body.owner).toBe(testUser._id);
    postId = response.body._id;
  });

  test("Test Adding invalid post", async () => {
    const response = await request(app).post("/posts").send(invalidPost);
    expect(response.status).not.toBe(201);
  });

  test("Test get all posts after adding", async () => {
    const response = await request(app).get("/posts");
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
  });

  test("Test get post by owner", async () => {
    const response = await request(app).get("/posts?owner=" + testUser._id);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].owner).toBe(testUser._id);
  });

  test("Test get post by owner fail", async () => {
    const response = await request(app).get(
      "/posts?owner=" + testPost.owner + "1"
    );
    expect(response.status).not.toBe(201);
  });

  test("Test get post by id", async () => {
    const response = await request(app).get("/posts/" + postId);
    expect(response.status).toBe(200);
    expect(response.body.title).toBe("test title");
    expect(response.body.content).toBe("test content");
    expect(response.body._id).toBe(postId);
  });

  const invalidPostId = new mongoose.Types.ObjectId("675ad3702a7e6e3b1af92e8d");

  test("Test get post by id fail", async () => {
    const response = await request(app).get("/posts/" + invalidPostId);
    expect(response.status).not.toBe(200);
  });

  test("Test Update post by id", async () => {
    const response = await request(app)
      .put("/posts/" + postId)
      .set({ authorization: "JWT " + testUser.accessToken })
      .send(testPostUpdate);
    expect(response.status).toBe(200);
    expect(response.body.title).toBe(testPostUpdate.title);
    expect(response.body.content).toBe(testPostUpdate.content);
    expect(response.body.owner).toBe(testUser._id);
  });

  test("Test Delete post by id", async () => {
    const response = await request(app)
      .delete("/posts/" + postId)
      .set({ authorization: "JWT " + testUser.accessToken });
    expect(response.status).toBe(200);
    const responseGet = await request(app).get("/posts/" + postId);
    expect(responseGet.status).not.toBe(200);
  });

  test("Test Update post by id fail", async () => {
    const response = await request(app)
      .put("/posts/" + postId + 1)
      .send(testPostUpdate);
    expect(response.status).not.toBe(200);
  });

  test("Test Delete post by id fail", async () => {
    const response = await request(app)
      .delete("/posts/" + 1)
      .set({ authorization: "JWT " + testUser.accessToken });
    expect(response.status).not.toBe(200);
  });
});
