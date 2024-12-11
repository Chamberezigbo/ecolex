const express = require("express");
const cors = require("cors");

const adminRoutes = require("./routes/admin");
const schoolSetupRoutes = require("./routes/school");

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

//Test the root route//
app.get("/api", (req, res) => {
  res.send("Welcome to the API");
});

app.listen(PORT, () => {
  console.log(`server running on server on http:${PORT}`);
});
