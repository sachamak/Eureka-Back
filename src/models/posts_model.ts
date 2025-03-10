import mongoose from "mongoose";

export interface iPost {
  title: string;
  content: string;
  owner: string;
  image?: string;
  likes: string[];
  comments: mongoose.Types.ObjectId[];
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
    type: [String],
    default: [],
    ref: "comments",
  },
});

const postModel = mongoose.model<iPost>("posts", postSchema);

export default postModel;
