/** @format */

import express from "express";
import itemController from "../controllers/item_controller";
import { authMiddleware } from "../controllers/auth_controller";
import multer from "multer";

const router = express.Router();
const base = process.env.DOMAIN_BASE + "/";
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/items");
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split(".").filter(Boolean).slice(1).join(".");
    cb(null, Date.now() + "." + ext);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    console.log("Received file with field name:", file.fieldname);
    cb(null, true);
  },
});

router.post(
  "/",
  authMiddleware,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const file = files?.file?.[0] || files?.image?.[0];

      if (!file) {
        res.status(400).send("Missing required file. Please upload an image with field name 'file' or 'image'." );
        return;
      }

      const imageUrl = base + file.path;
      req.body.imageUrl = imageUrl;
      req.body.userId = req.body.userId || req.params.userId;

      if (req.body.name) {
        req.body.description = req.body.description || req.body.name;
      }

      if (req.body.location) {
        if (typeof req.body.location === "string") {
          try {
            req.body.location = JSON.parse(req.body.location);
          } catch (e) {
            console.log("Failed to parse location JSON:", e);
          }
        }
      }

      if (req.body.itemType) {
        req.body.itemType = req.body.itemType.toLowerCase();
      } else if (req.body.kind) {
        req.body.itemType = req.body.kind.toLowerCase();
      }

      req.file = file;

      if (!req.body.itemType) {
         res.status(400).send("Missing required field: itemType");
        return;
      }

      if (req.body.itemType !== "lost" && req.body.itemType !== "found") {
         res.status(400).send("Item type must be 'lost' or 'found'");
        return;
      }

      itemController.uploadItem(req, res);

    } catch (error) {
      console.error("Error in /items POST route:", error);
      res
        .status(500)
        .send("Error uploading item: " + (error as Error).message);
    }
  }
);

router.get("/", itemController.getAllItems);
  

router.get("/:id", itemController.getItemById);



router.put("/:id", authMiddleware, itemController.updateItem);


router.delete("/:id", authMiddleware, itemController.deleteItem);


export default router;