require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db/pool");
const { verifyConnection } = require("./db/pool");

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
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
  console.error("JWT_SECRET is required when NODE_ENV=production");
  process.exit(1);
}

if (isProduction) {
  app.set("trust proxy", 1);
}

// ── Middleware ──────────────────────────────────────────────
const rawClientOrigins = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const clientOrigins = rawClientOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && clientOrigins.includes("*")) {
  console.warn(
    "Warning: CLIENT_ORIGIN=* allows any origin. Set an explicit frontend URL in production.",
  );
}

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
app.use(express.json({ limit: "1mb" }));

// Request logger in development
if (!isProduction) {
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

// Health check (used by deploy platforms)
app.get("/ping", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch (err) {
    console.error("Health check failed:", err.message);
    res.status(503).json({ ok: false, database: "disconnected" });
  }
});

// 404 handler
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

const { execSync } = require("child_process");
const autoMigrate =
  process.env.AUTO_MIGRATE === "true" ||
  (!isProduction && process.env.AUTO_MIGRATE !== "false");
const autoSeed = process.env.AUTO_SEED === "true";

async function runMigrations() {
  if (!autoMigrate) {
    console.log(
      "Skipping automatic migrations. Set AUTO_MIGRATE=true to enable.",
    );
    return;
  }

  try {
    console.log("Running migrations...");
    execSync("node src/db/migrate.js", { stdio: "inherit" });
    console.log("Migrations complete.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    throw err;
  }
}

async function seedIfEmpty() {
  if (!autoSeed) {
    console.log("Skipping automatic seeding. Set AUTO_SEED=true to enable.");
    return;
  }

  try {
    const { rows } = await pool.query("SELECT COUNT(*) as count FROM users");
    if (parseInt(rows[0].count, 10) === 0) {
      execSync("node src/db/seed.js", { stdio: "inherit" });
      console.log("Seed complete.");
    }
  } catch (err) {
    console.error("Seed check failed:", err.message);
    throw err;
  }
}

let server;

async function start() {
  try {
    await verifyConnection();
    console.log("Database connected");

    await runMigrations();
    await seedIfEmpty();

    const PORT = process.env.PORT || 4000;
    server = app.listen(PORT, () => {
      console.log(`ChickenAudit API running on port ${PORT}`);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use`);
      } else {
        console.error("Server failed to listen:", err.message);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
