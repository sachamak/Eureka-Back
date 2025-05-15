/** @format */

import { Request, Response } from "express";
import itemModel, { IItem } from "../models/item_model";
import userModel from "../models/user_model";



const uploadItem = async (req: Request, res: Response) => {
  try {
    if (!req.body.userId) {
      return res.status(400).send("Missing required field: userId");
    }

    if (!req.body.imageUrl) {
      return res.status(400).send( "Missing required field: imageUrl");
    }

    if (typeof req.body.imageUrl !== "string" || !req.body.imageUrl.trim()) {
      return res.status(400).send("Invalid imageUrl format");
    }

    if (!req.body.itemType) {
      return res.status(400).send("Missing required field: itemType");
    }

    if (req.body.itemType !== "lost" && req.body.itemType !== "found") {
      return res.status(400).send("Item type must be 'lost' or 'found'");
    }

    
    const user = await userModel.findById(req.body.userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    let locationData = req.body.location;
    if (typeof locationData === "string") {
      try {
        locationData = JSON.parse(locationData);
      } catch (e) {
        console.log("Failed to parse location JSON:", e);
      }
    }

    const newItem: IItem = {
      userId: req.body.userId,
      imageUrl: req.body.imageUrl,
      itemType: req.body.itemType,
      description: req.body.description || "",
      location: locationData || "", 
      category: req.body.category || "",
      ownerName: user.userName,
      ownerEmail: user.email,
    };

    const savedItem = await itemModel.create(newItem);
    console.log("Item saved successfully with ID:", savedItem._id);
    return res.status(201).send(savedItem);
    } catch (error) {
    return res.status(500).send("Error uploading item: " + (error as Error).message);
}
};

const getAllItems = async (req: Request, res: Response) => {
  try {
    const itemType = req.query.itemType as string;
    const userId = req.query.userId as string;

    const query: Record<string, unknown> = {};

    if (itemType && (itemType === "lost" || itemType === "found")) {
      query.itemType = itemType;
    }

    if (userId) {
      query.userId = userId;
    }

    const items = await itemModel.find(query);


    return res.status(200).send(items);
  } catch (error) {
    console.error("Error getting items:", error);
    return res
      .status(500)
      .send("Error fetching items: " + (error as Error).message);
  }
};

const getItemById = async (req: Request, res: Response) => {
  try {
    const itemId = req.params.id;
    if (!itemId) {
      return res.status(400).send("Item ID is required");
    }

    const item = await itemModel.findById(itemId);

    if (!item) {
      return res.status(404).send("Item not found");
    }

    return res.status(200).send(item);
  } catch (error) {
    console.log("Error getting item by ID:", error);
    return res
      .status(500)
      .send("Error fetching item: " + (error as Error).message);
  }
};


const updateItem = async (req: Request, res: Response) => {
  try {
    const item = await itemModel.findById(req.params.id);
    if (!item) {
      return res.status(404).send("Item not found");
    }

    if (item.userId !== req.body.userId) {
      return res.status(403).send("Not authorized to update this item");
    }

    if (req.body.description) item.description = req.body.description;
    if (req.body.location) item.location = req.body.location;
    if (req.body.category) item.category = req.body.category;

    await item.save();
    res.status(200).send(item);
  } catch (error) {
    res.status(500).send("Error updating item: " + (error as Error).message);
  }
};

const deleteItem = async (req: Request, res: Response) => {
  try {
    const item = await itemModel.findById(req.params.id);
    if (!item) {
      return res.status(404).send("Item not found");
    }

    if (item.userId !== req.body.userId) {
      return res.status(403).send("Not authorized to delete this item");
    }

    await itemModel.findByIdAndDelete(req.params.id);
    res.status(200).send("Item deleted successfully" );
  } catch (error) {
    res.status(500).send("Error deleting item: " + (error as Error).message);
  }
};


export default {
  uploadItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
};
