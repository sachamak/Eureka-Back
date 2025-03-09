import postModel, { iPost } from "../models/posts_model";
import BaseController from "./base_controller";
import { Request, Response } from "express";

class PostController extends BaseController<iPost> {
  constructor() {
    super(postModel);
  }
  async create(req: Request, res: Response) {
    try {
      const { title, content } = req.body;
      const userId = req.params.userId;

      const imagePath = req.file ? `/public/${req.file.filename}` : undefined;
      
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
        return res.status(404).json({ message: "Post not found" });
      }

      let imagePath = post.image;
      if (req.file) {
        const base = process.env.DOMAIN_BASE || "";
        imagePath = `${base}/public/${req.file.filename}`;
      }

      const updatedPost = await this.model.findByIdAndUpdate(
        postId,
        { title, content, image: imagePath },
        { new: true }
      );

      res.status(200).json(updatedPost);
    } catch (error) {
      res.status(400).send(error);
    }
  }
}

export default new PostController();
