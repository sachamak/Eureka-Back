import { Request, Response } from "express";
import { Model } from "mongoose";

class BaseController<T> {
  model: Model<T>;
  constructor(model: Model<T>) {
    this.model = model;
  }

  async getAll(req: Request, res: Response) {
    const ownerFilter = req.query.owner;
    try {
      if (ownerFilter) {
        const Item = await this.model.find({ owner: ownerFilter });
        res.status(200).send(Item);
      } else {
        const Item = await this.model.find();
        res.status(200).send(Item);
      }
    } catch (err) {
      res.status(400).send(err);
    }
  }

  async getById(req: Request, res: Response) {
    const id = req.params.id;
    try {
      const Item = await this.model.findById(id);
      if (Item === null) {
        res.status(404).send("Item not found");
      } else {
        res.status(200).send(Item);
      }
    } catch (err) {
      res.status(400).send(err);
    }
  }

  async updateById(req: Request, res: Response) {
    const idfilter = req.params.id;
    const updateData = req.body;
    if (!idfilter) {
      res.status(400).send({ error: "Item ID is required" });
    }
    if (!updateData) {
      res.status(400).send({ error: "No Data to Update" });
    }
    try {
      const updatedItem = await this.model.findByIdAndUpdate(
        idfilter,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedItem) {
        res.status(404).send({ error: "Item Not Found or Failed to Update" });
      }
      res.status(200).send(updatedItem);
    } catch (err) {
      res.status(500).send(err);
    }
  }

  async deleteById(req: Request, res: Response) {
    const itemId = req.params.id;
    try {
      const item = await this.model.findById(itemId);
      if (!item) {
        res.status(404).send({ error: "Item not found" });
      }
      await this.model.findByIdAndDelete(itemId);
      res.status(200).send({ error: "Item deleted successfully" });
    } catch (error) {
      res.status(500).send(error);
    }
  }

  async create(req: Request, res: Response) {
    console.log(req.body);
    try {
      const Item = await this.model.create(req.body);
      res.status(201).send(Item);
    } catch (err) {
      res.status(400);
      res.send(err);
    }
  }
}

export default BaseController;
