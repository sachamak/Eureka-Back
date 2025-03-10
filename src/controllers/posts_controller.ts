import postModel, { iPost } from "../models/posts_model";
import BaseController from "./base_controller";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";

class PostController extends BaseController<iPost> {
  constructor() {
    super(postModel);
  }
  async create(req: Request, res: Response) {
    try {
      const { title, content } = req.body;
      const userId = req.params.userId;

      const imagePath = req.file
        ? `/public/posts/${req.file.filename}`
        : undefined;

      const Post = await this.model.create({
        title,
        content,
        owner: userId,
        image: imagePath,
      });

      res.status(201).send(Post);
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { title, content } = req.body;
      const postId = req.params.id;
      const post = await this.model.findById(postId);
      if (!post) {
        return res.status(404).send({ message: "Post not found" });
      }
      let imagePath = post.image;
      if (req.file) {
        if (post.image) {
          const oldImagePath = path.join(
            __dirname,
            "..",
            "public",
            post.image.replace(/^.*\/public\//, "")
          );
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        imagePath = `/public/posts/${req.file.filename}`;
      }
      const updatedPost = await this.model.findByIdAndUpdate(
        postId,
        { title, content, image: imagePath },
        { new: true }
      );

      res.status(200).send(updatedPost);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).send({ message: "Server Error", error });
    }
  }

  async likePost(req: Request, res: Response) {
    try {
      const postId = req.params.id;
      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).send("Unauthorized");
      }

      const post = await this.model.findById(postId);

      if (!post) {
        return res.status(401).send("Post not found");
      }

      const update = post.likes.includes(userId)
        ? { $pull: { likes: userId } }
        : { $addToSet: { likes: userId } };

      const updatedPost = await this.model
        .findByIdAndUpdate(postId, update, { new: true })
        .populate("owner")
        .populate("likes");
      res.status(200).send(updatedPost);
    } catch (error) {
      res.status(500).send(error);
    }
  }
}

export default new PostController();
