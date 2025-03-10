import commentsModel, { iComment } from "../models/comments_model";
import BaseController from "./base_controller";
import { Request, Response } from "express";
import PostModel from "../models/posts_model";

class commentsController extends BaseController<iComment> {
  constructor() {
    super(commentsModel);
  }

  async create(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const comment = { ...req.body, owner: userId };
      req.body = comment;
      const createdComment = await this.model.create(comment);
      await PostModel.findByIdAndUpdate(
        req.body.postId,
        {
          $push: {
            comments: createdComment._id,
          },
        },
        { new: true }
      );
      res.status(201).send(createdComment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).send({ message: "Server error", error });
    }
  }
}

export default new commentsController();
