const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireOwner } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

const dailyLogSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  eggs_collected: z.number().int().min(0),
  feed_given_kg: z.number().min(0),
  deaths: z.number().int().min(0).default(0),
  notes: z.string().nullable().optional(),
});

// GET /daily-logs — return all logs newest first, joined with user name
router.get("/", requireAuth, async (req, res) => {
  try {
    const isOwner = req.user.role === "owner";
    const whereClause = isOwner ? "" : "where dl.logged_by = $1";
    const params = isOwner ? [] : [req.user.id];

    const { rows } = await pool.query(`
      select
        dl.*,
        u.full_name as logged_by_name
      from daily_logs dl
      join users u on u.id = dl.logged_by
      ${whereClause}
      order by dl.log_date desc
      limit 60
    `, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /daily-logs — create a new log entry
router.post("/", requireAuth, validate(dailyLogSchema), async (req, res) => {
  const { log_date, eggs_collected, feed_given_kg, deaths, notes } = req.body;
  try {
    const { rows } = await pool.query(
      `insert into daily_logs (logged_by, log_date, eggs_collected, feed_given_kg, deaths, notes)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [req.user.id, log_date, eggs_collected, feed_given_kg, deaths, notes ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // Unique violation — a log already exists for that date
    if (err.code === "23505") {
      return res.status(409).json({ message: `A log for ${log_date} already exists` });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /daily-logs/:id — update (only the entry owner or owner role)
router.put("/:id", requireAuth, validate(dailyLogSchema), async (req, res) => {
  const { log_date, eggs_collected, feed_given_kg, deaths, notes } = req.body;
  try {
    // Check ownership
    const existing = await pool.query("select logged_by from daily_logs where id = $1", [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ message: "Log not found" });
    if (existing.rows[0].logged_by !== req.user.id && req.user.role !== "owner") {
      return res.status(403).json({ message: "Not authorized to edit this log" });
    }

    const { rows } = await pool.query(
      `update daily_logs
       set log_date=$1, eggs_collected=$2, feed_given_kg=$3, deaths=$4, notes=$5
       where id=$6 returning *`,
      [log_date, eggs_collected, feed_given_kg, deaths, notes ?? null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: `A log for ${log_date} already exists` });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /daily-logs/:id — owner only
router.delete("/:id", requireAuth, requireOwner, async (req, res) => {
  try {
    const { rowCount } = await pool.query("delete from daily_logs where id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: "Log not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
