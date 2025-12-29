const { error } = require("winston");
const { AppError } = require("../util/AppError");

exports.notFound = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
}