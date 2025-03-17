import mongoose from "mongoose";

export interface iComment {
  _id?: string;
  content: string;
  postId: string;
  owner: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const commentsSchema = new mongoose.Schema<iComment>({
  content: {
    type: String,
    required: true,
  },
  postId: {
    type: String,
    required: true,
  },
  owner: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const commentsModel = mongoose.model<iComment>("comments", commentsSchema);

export default commentsModel;
