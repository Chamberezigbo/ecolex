const express = require("express");
const cors = require("cors");

const adminRoutes = require("./routes/admin");
const schoolSetupRoutes = require("./routes/school");
const classRoutes = require("./routes/class");
const systemAdmin = require("./routes/system-admin/generateToken");
const studentRoutes = require("./routes/student");
const teacherRoutes = require("./routes/teacher");

const app = express();
const PORT = process.env.PORT || 3000;

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

//Test the root route//
app.get("/api", (req, res) => {
  res.send("Welcome to the API");
});

app.listen(PORT, () => {
  console.log(`server running on server on http:${PORT}`);
});
