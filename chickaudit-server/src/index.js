require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes      = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const dailyLogRoutes  = require("./routes/dailyLogs");
const salesRoutes     = require("./routes/sales");
const expenseRoutes   = require("./routes/expenses");
const healthRoutes    = require("./routes/health");
const userRoutes      = require("./routes/users");

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// Request logger in development
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ── Routes ─────────────────────────────────────────────────
app.use("/auth",       authRoutes);
app.use("/dashboard",  dashboardRoutes);
app.use("/daily-logs", dailyLogRoutes);
app.use("/sales",      salesRoutes);
app.use("/expenses",   expenseRoutes);
app.use("/health",     healthRoutes);
app.use("/users",      userRoutes);

// Health check (used by Railway)
app.get("/ping", (_req, res) => res.json({ ok: true }));

// 404 handler
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

// ── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
// Auto-run migrations on startup
const { execSync } = require('child_process');
try {
  console.log('Running migrations...');
  execSync('node src/db/migrate.js', { stdio: 'inherit' });
  console.log('Migrations complete.');
} catch (err) {
  console.error('Migration failed:', err.message);
}

app.listen(PORT, () => {
  console.log(`🐔  ChickAudit API running on http://localhost:${PORT}`);
});
// Nodemon trigger

