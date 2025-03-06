import commentsModel,{iComment} from "../models/comments_model";
import BaseController from "./base_controller";
import { Request, Response } from "express";

class commentsController extends BaseController<iComment>{
    constructor(){
        super(commentsModel);
    }

  async create(req: Request, res: Response) {
      const userId = req.params.userId;
      const comment = { ...req.body, owner: userId };
      req.body = comment;
      super.create(req, res);
    }

}

export default new commentsController();