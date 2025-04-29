const jwt = require("jsonwebtoken");

// Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET;

const authenticate = (req, res, next) => {
       const token = req.headers.authorization?.split(" ")[1];
       if (!token) {
              return res.status(401).json({ message: "Access denied. No token provided." });
       }
       
       try {
              const decoded = jwt.verify(token, JWT_SECRET);
              req.user = decoded;
              next();
       } catch (error) {
              res.status(401).json({ message: "Access denied. Invalid token." });
       }
}

module.exports = authenticate; 