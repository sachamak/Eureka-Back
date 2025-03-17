/** @format */

import postModel, { iPost } from "../models/posts_model";
import BaseController from "./base_controller";
import { Request, Response } from "express";

class PostController extends BaseController<iPost> {
  constructor() {
    super(postModel);
  }
  async create(req: Request, res: Response) {
    const base = process.env.DOMAIN_BASE;
    try {
      const { title, content } = req.body;
      const userId = req.params.userId;

      const imagePath = req.file
      ? `${base}/public/posts/${req.file.filename}`
      : undefined;

      const Post = await this.model.create({
        title,
        content,
        owner: userId,
        image: imagePath,
      });
      console.log(Post);
      res.status(201).send(Post);
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { title, content } = req.body;
      const postId = req.params.id;
      const base = process.env.DOMAIN_BASE;

      const post = await this.model.findById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      let imagePath = post.image;
      if (req.file) {
        imagePath = `${base}/public/posts/${req.file.filename}`;
      }

      const updatedPost = await this.model.findByIdAndUpdate(
        postId,
        { title, content, image: imagePath },
        { new: true }
      );

      res.status(200).send(updatedPost);
    } catch (error) {
      res.status(500).send(error);
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
