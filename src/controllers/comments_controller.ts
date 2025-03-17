/** @format */
import commentsModel, { iComment } from "../models/comments_model";
import BaseController from "./base_controller";
import { Request, Response } from "express";
import PostModel from "../models/posts_model";
import mongoose from "mongoose";
import userModel from "../models/user_model";

class commentsController extends BaseController<iComment> {
  constructor() {
    super(commentsModel);
  }

  async create(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      if (!userId) {
        res.status(401).send("Unauthorized");
      }
      const user = await userModel.findById(userId);
      if (!user) {
        res.status(404).send("User not found");
      }
      const comment = { ...req.body, owner: user?.userName };
      req.body = comment;
      const createdComment = await this.model.create(comment);
      await PostModel.findByIdAndUpdate(
        req.body.postId,
        {
          $push: {
            comments: createdComment.toObject(),
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
    const commentId = req.params.id;
    const updateData = req.body;
    if (!commentId) {
      return res.status(400).send({ error: "Comment ID is required" });
    }
    if (!updateData) {
      return res.status(400).send({ error: "No Data to Update" });
    }
    try {
      const updatedComment = await this.model.findByIdAndUpdate(
        commentId,
        updateData,
        { new: true, runValidators: true }
      );
      if (!updatedComment) {
        return res.status(404).send({ error: "Comment not found" });
      }
      await PostModel.updateOne(
        { "comments._id": updatedComment._id },
        {
          $set: {
            "comments.$.content": updateData.content,
          },
        }
      );
      res.status(200).send(updatedComment);
    } catch (err) {
      console.error("Error updating comment:", err);
      res.status(500).send(err);
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
              comments: { _id: new mongoose.Types.ObjectId(id) },
            },
          },
          { new: true }
        );
      }
      res.status(200).send("Comment deleted successfully");
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).send(error);
    }
  }
}

export default new commentsController();
