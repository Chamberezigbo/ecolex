import { Request, Response, NextFunction } from "express";
import { AppError } from "../util/AppError";
import logger from "../config/logger";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error =
    err instanceof AppError
      ? err
      : new AppError("Internal Server Error", 500);

  logger.error(`${req.method} ${req.url} - ${error.message}`);

  res.status(error.statusCode).json({
    success: false,
    message: error.message
  });
};
