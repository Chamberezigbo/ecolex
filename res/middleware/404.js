const { error } = require("winston");

exports.notFound = (req, res, next) => {
  res.status(404).json({ 
    success: false,
    message: `Resource not found${req.method}`,
    error: 'Route not found'
});
}