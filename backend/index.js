require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const dataRoutes = require("./routes/dataRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "asmita_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "AsmitA CP Portal API" });
});

app.use("/api/auth", authRoutes);
app.use("/api", (req, res, next) => {
  if (req.session?.user) return next();
  return res.status(401).json({ error: "Unauthorized" });
});
app.use("/api", dataRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
