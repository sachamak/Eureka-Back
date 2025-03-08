import mongoose from "mongoose";

export interface iUser {
  email: string;
  password: string;
  _id?: string;
  refreshToken?: string[];
  imgURL?: string;
}

const userSchema = new mongoose.Schema<iUser>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: [String],
    default: [],
  },
  imgURL: {
    type: String,
  },
});

const userModel = mongoose.model<iUser>("users", userSchema);

export default userModel;
