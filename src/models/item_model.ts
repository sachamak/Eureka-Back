/**
 * eslint-disable @typescript-eslint/no-explicit-any
 *
 * @format
 */

import mongoose from "mongoose";

export interface IItem {
  _id?: string;
  userId: string;
  imageUrl: string;
  itemType: "lost" | "found";
  description?: string;
  location?:
    | {
        lat: number;
        lng: number;
      }
    | string;
  category?: string;
  timestamp?: Date;
  ownerName?: string;
  ownerEmail?: string;
}

const itemSchema = new mongoose.Schema<IItem>(
  {
    userId: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    itemType: {
      type: String,
      enum: ["lost", "found"],
      required: true,
    },
    description: {
      type: String,
    },
    location: {
      type: mongoose.Schema.Types.Mixed,
    },
    category: {
      type: String,
    },
    ownerName: {
      type: String,
    },
    ownerEmail: {
      type: String,
    },
  },
  { timestamps: true }
);

const itemModel = mongoose.model<IItem>("items", itemSchema);

export default itemModel;
