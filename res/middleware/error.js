const logger = require("../config/logger"); // adjust the path if needed
const { AppError } = require("../util/AppError");

const errorMiddleware = (err, req, res, next) => {
  console.log(err);
  // Log error to file using Winston
  logger.error(`${req.method} ${req.url} - ${err.message}\n${err.stack}`);

  next(err instanceof AppError ? err : new AppError("Internal Server Error", 500));
};

module.exports = errorMiddleware;
