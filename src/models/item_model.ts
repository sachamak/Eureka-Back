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
  date?: Date;
  category?: string;
  colors?: string[];
  brand?: string;
  condition?: "new" | "worn" | "damaged" | "other";
  flaws?: string;
  material?: string;
  timestamp?: Date;
  ownerName?: string;
  ownerEmail?: string;
  visionApiData?: {
    labels?: string[];
    objects?: Array<{
      name: string;
      score: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
  };
  matchedItemId?: string;
  isResolved?: boolean;
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
    date: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
    },
    colors: {
      type: [String],
    },
    brand: {
      type: String,
    },
    condition: {
      type: String,
    },
    flaws: {
      type: String,
    },
    material: {
      type: String,
    },
    ownerName: {
      type: String,
    },
    ownerEmail: {
      type: String,
    },
    visionApiData: {
      labels: [String],
      objects: [
        {
          name: String,
          score: Number,
          boundingBox: {
            x: Number,
            y: Number,
            width: Number,
            height: Number,
          },
        },
      ],
    },
    matchedItemId: {
      type: String,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const itemModel = mongoose.model<IItem>("items", itemSchema);

export default itemModel;
