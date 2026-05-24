require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db/pool");

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const dailyLogRoutes = require("./routes/dailyLogs");
const salesRoutes = require("./routes/sales");
const expenseRoutes = require("./routes/expenses");
const healthRoutes = require("./routes/health");
const userRoutes = require("./routes/users");
const settingsRoutes = require("./routes/settings");
const chickensRoutes = require("./routes/chickens");
const exportRoutes = require("./routes/export");

const app = express();

// ── Middleware ──────────────────────────────────────────────
const rawClientOrigins = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const clientOrigins = rawClientOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (clientOrigins.includes("*") || clientOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Request logger in development
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ── Routes ─────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/daily-logs", dailyLogRoutes);
app.use("/sales", salesRoutes);
app.use("/expenses", expenseRoutes);
app.use("/health", healthRoutes);
app.use("/users", userRoutes);
app.use("/settings", settingsRoutes);
app.use("/chickens", chickensRoutes);
app.use("/export", exportRoutes);

// Health check (used by Railway)
app.get("/ping", (_req, res) => res.json({ ok: true }));

// 404 handler
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

// Auto-run migrations on startup only when explicitly enabled
const { execSync } = require("child_process");
const autoMigrate =
  process.env.AUTO_MIGRATE === "true" || process.env.NODE_ENV !== "production";
const autoSeed = process.env.AUTO_SEED === "true";

if (autoMigrate) {
  try {
    console.log("Running migrations...");
    execSync("node src/db/migrate.js", { stdio: "inherit" });
    console.log("Migrations complete.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
} else {
  console.log(
    "Skipping automatic migrations. Set AUTO_MIGRATE=true to enable.",
  );
}

async function seedIfEmpty() {
  try {
    const { rows } = await pool.query("SELECT COUNT(*) as count FROM users");
    if (parseInt(rows[0].count, 10) === 0) {
      execSync("node src/db/seed.js", { stdio: "inherit" });
      console.log("Seed complete.");
    }
  } catch (err) {
    console.error("Seed check failed:", err.message);
  }
}

if (autoSeed) {
  seedIfEmpty();
} else {
  console.log("Skipping automatic seeding. Set AUTO_SEED=true to enable.");
}

// ── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🐔  ChickenAudit API running on http://localhost:${PORT}`);
});
// Nodemon trigger 2
