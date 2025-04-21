const logger = require("../res/logger"); // adjust the path if needed

const errorMiddleware = (err, req, res, next) => {
  console.log(err);
  // Log error to file using Winston
  logger.error(`${req.method} ${req.url} - ${err.message}\n${err.stack}`);

  // Send JSON response to the client
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorMiddleware;
