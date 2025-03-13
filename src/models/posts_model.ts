import mongoose from "mongoose";
import commentsModel, { iComment } from "./comments_model";

export interface iPost {
  title: string;
  content: string;
  owner: string;
  image?: string;
  likes: string[];
  comments: iComment[];
}

const postSchema = new mongoose.Schema<iPost>({
  title: {
    type: String,
    required: true,
  },
  content: String,
  owner: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  likes: {
    type: [String],
    default: [],
  },
  comments: {
    type: [commentsModel.schema],
    default: [],
  },
});

const postModel = mongoose.model<iPost>("posts", postSchema);

export default postModel;
