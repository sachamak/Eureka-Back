/** @format */
import { Request, Response } from "express";
import itemModel, { IItem } from "../models/item_model";
import userModel from "../models/user_model";
import visionService from "../services/vision-service";
import matchModel, { IMatch } from "../models/match_model";
import { MatchingService } from "../services/matching-service";

const uploadItem = async (req: Request, res: Response) => {
  try {
    console.log("Uploading New Item");

    if (!req.body.userId) {
      console.error("Missing userId in request body");
      return res.status(400).send("Error");
    }

    if (!req.body.imageUrl) {
      console.error("Missing imageUrl in request body");
      return res.status(400).send();
    }

    if (typeof req.body.imageUrl !== "string" || !req.body.imageUrl.trim()) {
      console.error("Invalid imageUrl format:", req.body.imageUrl);
      return res.status(400).send("Error");
    }

    if (!req.body.itemType) {
      console.error("Missing itemType in request body");
      return res.status(400).send("Error");
    }

    if (req.body.itemType !== "lost" && req.body.itemType !== "found") {
      console.error("Invalid itemType:", req.body.itemType);
      return res.status(400).send("Error");
    }

    const visionApiData = await enhanceItemWithAI(req.body.imageUrl);

    const user = await userModel.findById(req.body.userId);
    if (!user) {
      console.error("User not found:", req.body.userId);
      return res.status(400).send("Error");
    }

    let locationData = req.body.location;
    if (typeof locationData === "string") {
      try {
        locationData = JSON.parse(locationData);
        console.log("Successfully parsed location JSON:", locationData);
      } catch (e) {
        console.error("Failed to parse location JSON:", e);
      }
    }

    const newItem: IItem = {
      userId: req.body.userId,
      imageUrl: req.body.imageUrl,
      itemType: req.body.itemType,
      description: req.body.description,
      location: locationData,
      category: req.body.category,
      colors: req.body.colors,
      brand: req.body.brand || "",
      condition: req.body.condition,
      flaws: req.body.flaws,
      material: req.body.material,
      ownerName: user.userName,
      ownerEmail: user.email,
      visionApiData: visionApiData.visionApiData,
      isResolved: false,
    };

    const savedItem = await itemModel.create(newItem);

    let potentialMatches: Array<{ item: IItem; score: number }> = [];
    try {
      potentialMatches = await findPotentialMatches(savedItem);
    } catch (error) {
      console.error("Error finding potential matches:", error);
      potentialMatches = [];
    }

    try {
      const highConfidenceMatches = potentialMatches.filter(
        (match) => match.score > 70
      );

      if (highConfidenceMatches.length > 0) {
        for (const match of highConfidenceMatches) {
          const matchedItem = match.item;
          const matchOwner = await userModel.findById(matchedItem.userId);

          if (matchOwner && matchedItem._id) {
            const newMatch: IMatch = {
              item1Id: matchedItem._id,
              userId1: matchOwner._id,
              item2Id: savedItem._id,
              userId2: savedItem.userId,
              matchScore: match.score,
            };
            const savedMatch = await matchModel.create(newMatch);
            if (!savedMatch) {
              res.status(400).send("Error");
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error  matched item owner:", error);
    }

    return res.status(201).send(newItem);
  } catch (error) {
    console.error("Error uploading item:", error);
    return res
      .status(500)
      .send("Error uploading item: " + (error as Error).message);
  }
};
const getAllItems = async (req: Request, res: Response) => {
  try {
    const itemType = req.query.itemType;
    const userId = req.query.userId;

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
const findPotentialMatches = async (
  item: IItem
): Promise<Array<{ item: IItem; score: number }>> => {
  try {
    const oppositeType = item.itemType === "lost" ? "found" : "lost";
    const potentialMatches = await itemModel.find({
      itemType: oppositeType,
      isResolved: false,
    });

    const matches = await MatchingService(item, potentialMatches);
    const significantMatches = matches.map((match) => ({
      item: match.item,
      score: match.confidenceScore,
    }));
    return significantMatches;
  } catch (error) {
    console.error("Error finding potential matches:", error);
    return [];
  }
};

export default {
  uploadItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
};
