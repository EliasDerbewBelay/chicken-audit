const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { canModifyRecord } = require("../middleware/ownership");
const { validate } = require("../middleware/validate");

const router = express.Router();

const healthSchema = z.object({
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_type: z.enum(["death","vet_visit","vaccination","illness","recovery"]),
  details: z.string().min(1),
});

// GET /health
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      select h.*, u.full_name as recorded_by_name
      from health_events h
      join users u on u.id = h.recorded_by
      order by h.event_date desc, h.created_at desc
      limit 100
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /health
router.post("/", requireAuth, validate(healthSchema), async (req, res) => {
  const { event_date, event_type, details } = req.body;
  try {
    const { rows } = await pool.query(
      `insert into health_events (recorded_by, event_date, event_type, details)
       values ($1,$2,$3,$4) returning *`,
      [req.user.id, event_date, event_type, details]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /health/:id
router.put("/:id", requireAuth, validate(healthSchema), async (req, res) => {
  const { event_date, event_type, details } = req.body;
  try {
    const existing = await pool.query("select recorded_by from health_events where id=$1", [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ message: "Event not found" });
    if (!canModifyRecord(req.user, existing.rows[0].recorded_by)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { rows } = await pool.query(
      `update health_events set event_date=$1,event_type=$2,details=$3 where id=$4 returning *`,
      [event_date, event_type, details, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /health/:id — owner or entry creator
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await pool.query("select recorded_by from health_events where id=$1", [
      req.params.id,
    ]);
    if (!existing.rows[0]) return res.status(404).json({ message: "Event not found" });
    if (!canModifyRecord(req.user, existing.rows[0].recorded_by)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { rowCount } = await pool.query("delete from health_events where id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
