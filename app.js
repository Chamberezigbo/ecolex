const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const adminRoutes = require("./routes/admin");
const schoolSetupRoutes = require("./routes/school");
const classRoutes = require("./routes/class");
const systemAdmin = require("./routes/system-admin/generateToken");
const studentRoutes = require("./routes/student");
const teacherRoutes = require("./routes/teacher");
const setupRoutes = require("./routes/setup");
const errorMiddleware = require("./middleware/error");

const app = express();
const prisma = new PrismaClient();

app.use(cors());

// Parse JSON bodies//
app.use(express.json());

// Static files //
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/school", schoolSetupRoutes);
app.use("/api/class", classRoutes);
app.use("/api/system-admin", systemAdmin);
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/setup", setupRoutes);

// Always at the end, after all routes
app.use(errorMiddleware);

// Function to start the server after DB connection
async function startServer() {
  try {
    console.log("Connecting to database...");
    await prisma.$connect();
    console.log("Database connected successfully!");

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1); // Stop the server if DB connection fails
  }
}

// Start the server
startServer();
