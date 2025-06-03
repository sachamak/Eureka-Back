/** @format */

import { Request, Response } from "express";
import notificationModel from "../models/notification_model";

const getAllByUserId = async (req: Request, res: Response) => {
  const userId = req.query.userId;
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }
  try {
    const notifications = await notificationModel.find({ userId: userId });
    res.status(200).json({ data: notifications || [] });
    return;
  } catch (error) {
    console.error("Error getting notifications by user ID:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};

const getById = async (req: Request, res: Response) => {
  const notificationId = req.params.id;

  if (!notificationId) {
    res.status(400).json({ error: "Notification ID is required" });
    return;
  }

  try {
    const notification = await notificationModel.findById(notificationId);
    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.status(200).json({ data: notification });
    return;
  } catch (error) {
    console.error("Error getting notification by ID:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};

const deleteById = async (req: Request, res: Response) => {
  const notificationId = req.params.id;

  if (!notificationId) {
    res.status(400).json({ error: "Notification ID is required" });
    return;
  }

  try {
    const notification =
      await notificationModel.findByIdAndDelete(notificationId);
    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.status(200).json({ message: "Notification deleted successfully" });
    return;
  } catch (error) {
    console.error("Error deleting notification by ID:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};

const markAsRead = async (req: Request, res: Response) => {
  const notificationId = req.params.id;

  if (!notificationId) {
    res.status(400).json({ error: "Notification ID is required" });
    return;
  }

  try {
    const notification = await notificationModel.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    res.status(200).json({ data: notification });
    return;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};

const markAllAsRead = async (req: Request, res: Response) => {
  const userId = req.body.userId;

  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }

  try {
    const result = await notificationModel.updateMany(
      { userId: userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
    return;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};

export default {
  getAllByUserId,
  getById,
  deleteById,
  markAsRead,
  markAllAsRead,
};
