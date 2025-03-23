import express from "express";
const router = express.Router();
import commentController from "../controllers/comments_controller";
import { authMiddleware } from "../controllers/auth_controller";

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: API for managing comments
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - comment
 *         - owner
 *         - postId
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated ID of the comment
 *         comment:
 *           type: string
 *           description: The text of the comment
 *         owner:
 *           type: string
 *           description: ID of the user who created the comment
 *         postId:
 *           type: string
 *           description: ID of the post the comment belongs to
 *       example:
 *         _id: 5f4f5f4f5f4f5f4f5f4f5f4f
 *         comment: This is a comment
 *         owner: 5f4f5f4f5f4f5f4f5f4f5f4
 *         postId: 5f4f5f4f5f4f5f4f5f4f5f4
 */

/**
 * @swagger
 * /comments:
 *   get:
 *     summary: Retrieve all comments
 *     tags: [Comments]
 *     responses:
 *       200:
 *         description: A list of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       500:
 *         description: Internal server error
 */
router.get("/", commentController.getAll.bind(commentController));

/**
 * @swagger
 * /comments/{id}:
 *   get:
 *     summary: Retrieve a specific comment by ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the comment to retrieve
 *     responses:
 *       200:
 *         description: Comment data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", commentController.getById.bind(commentController));

/**
 * @swagger
 * /comments:
 *   post:
 *     summary: Create a new comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The text content of the comment
 *               postId:
 *                 type: string
 *                 description: The ID of the post the comment belongs to
 *             required:
 *               - content
 *               - postId
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authMiddleware,
  commentController.create.bind(commentController)
);

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete a comment by ID
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the comment to delete
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:id",
  authMiddleware,
  commentController.deleteById.bind(commentController)
);

/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Update a comment by ID
 *     description: Update an existing comment by its ID with the provided data
 *     tags:
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the comment to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The updated text content of the comment
 *             required:
 *               - comment
 *             example:
 *               content: "Updated comment text"
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request, invalid or missing parameters
 *       404:
 *         description: Comment not found or failed to update
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
  authMiddleware,
  commentController.update.bind(commentController)
);

export default router;