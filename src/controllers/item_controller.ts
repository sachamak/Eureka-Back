/** @format */
import { Request, Response } from "express";
import itemModel, { IItem } from "../models/item_model";
import userModel from "../models/user_model";
import visionService from "../services/vision-service";

const uploadItem = async (req: Request, res: Response) => {
  try {
    if (!req.body.userId) {
      res.status(400).send("Missing required field: userId");
      return;
    }

    if (!req.body.imageUrl) {
      res.status(400).send("Missing required field: imageUrl");
      return;
    }

    if (typeof req.body.imageUrl !== "string" || !req.body.imageUrl.trim()) {
      res.status(400).send("Invalid imageUrl format");
      return;
    }

    if (!req.body.itemType) {
      res.status(400).send("Missing required field: itemType");
      return;
    }

    if (req.body.itemType !== "lost" && req.body.itemType !== "found") {
      res.status(400).send("Item type must be 'lost' or 'found'");
      return;
    }

    const visionApiData = await enhanceItemWithAI(req.body.imageUrl);

    const user = await userModel.findById(req.body.userId);
    if (!user) {
      res.status(404).send("User not found");
      return;
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
      visionApiData: visionApiData.visionApiData,
      isResolved: false,
      eventDate: req.body.eventDate || req.body.date || null,
    };

    const savedItem = await itemModel.create(newItem);
    console.log("Item saved successfully with ID:", savedItem._id);
    res.status(201).send(savedItem);
    return;
  } catch (error) {
    res.status(500).send("Error uploading item: " + (error as Error).message);
    return;
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

    res.status(200).send(items);
    return;
  } catch (error) {
    console.error("Error getting items:", error);
    res.status(500).send("Error fetching items: " + (error as Error).message);
    return;
  }
};

const getItemById = async (req: Request, res: Response) => {
  try {
    const itemId = req.params.id;
    if (!itemId) {
      res.status(400).send("Item ID is required");
      return;
    }

    const item = await itemModel.findById(itemId);

    if (!item) {
      res.status(404).send("Item not found");
      return;
    }

    res.status(200).send(item);
    return;
  } catch (error) {
    console.log("Error getting item by ID:", error);
    res.status(500).send("Error fetching item: " + (error as Error).message);
    return;
  }
};

const updateItem = async (req: Request, res: Response) => {
  try {
    const item = await itemModel.findById(req.params.id);
    if (!item) {
      res.status(404).send("Item not found");
      return;
    }

    if (item.userId !== req.body.userId) {
      res.status(403).send("Not authorized to update this item");
      return;
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
      res.status(404).send("Item not found");
      return;
    }

    if (item.userId !== req.body.userId) {
      res.status(403).send("Not authorized to delete this item");
      return;
    }

    await itemModel.findByIdAndDelete(req.params.id);
    res.status(200).send("Item deleted successfully");
  } catch (error) {
    res.status(500).send("Error deleting item: " + (error as Error).message);
  }
};

const enhanceItemWithAI = async (imageUrl: string) => {
  try {
    const visionAnalysisResult = await visionService.getImageAnalysis(imageUrl);
    const labels = visionAnalysisResult.labels;
    const objects = visionAnalysisResult.objects.map((obj) => ({
      name: obj.name,
      score: obj.score,
      boundingBox: obj.boundingBox || {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
    }));

    return {
      visionApiData: {
        labels,
        objects,
      },
    };
  } catch (error) {
    console.error("Error enhancing item with AI:", error);
    return {
      visionApiData: {
        labels: [],
        objects: [],
      },
    };
  }
};

export default {
  uploadItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
};
