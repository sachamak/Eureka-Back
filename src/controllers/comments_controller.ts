/** @format */

import commentsModel, { iComment } from "../models/comments_model";
import BaseController from "./base_controller";
import { Request, Response } from "express";
import PostModel from "../models/posts_model";
import mongoose from "mongoose";

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
            comments: comment,
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

  async update(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const comment = { ...req.body, owner: userId };
      const updatedComment = await this.model.findByIdAndUpdate(
        req.params.commentId,
        comment,
        { new: true }
      );
      if (!updatedComment) {
        return res.status(404).send("Comment not found");
      }
      res.status(200).send(updatedComment);
    } catch (error) {
      res.status(500).send(error);
    }
  }

  async deleteById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).send("Invalid comment ID format");
        return;
      }

      const commentToDelete = await this.model.findById(id);
      if (!commentToDelete) {
        res.status(404).send("Comment not found");
        return;
      }

      await this.model.findByIdAndDelete(id);

      const postId = req.body.postId || commentToDelete.postId;
      if (postId && mongoose.Types.ObjectId.isValid(postId)) {
        await PostModel.findByIdAndUpdate(
          postId,
          {
            $pull: {
              comments: id,
            },
          },
          { new: true }
        );
      }

      res.status(200).send("Comment deleted successfully");
    } catch (error) {
      res.status(500).send(error);
    }
  }
}

export default new commentsController();
