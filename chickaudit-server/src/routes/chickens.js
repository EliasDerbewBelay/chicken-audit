const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /chickens
// Get all chicken adjustments
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      select c.*, u.full_name as recorded_by_name
      from chicken_adjustments c
      left join users u on u.id = c.recorded_by
      order by c.date desc, c.created_at desc
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /chickens
// Add a new adjustment and optionally update the baseline
router.post("/", requireAuth, async (req, res) => {
  const { date, type, quantity, reason } = req.body;
  
  if (!date || !type || quantity === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 0) {
    return res.status(400).json({ message: "Quantity must be a positive number" });
  }
  
  if (!['addition', 'reduction', 'audit', 'sold'].includes(type)) {
    return res.status(400).json({ message: "Invalid adjustment type" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert adjustment record
    const insertResult = await client.query(
      `insert into chicken_adjustments (date, type, quantity, reason, recorded_by)
       values ($1, $2, $3, $4, $5) returning *`,
      [date, type, qty, reason || null, req.user.id]
    );

    // Get current starting_flock setting
    const settingsResult = await client.query("select value from settings where key = 'starting_flock'");
    const fallbackFlock = Number(process.env.STARTING_FLOCK || 200);
    const currentStartingFlock = settingsResult.rows.length > 0 ? Number(settingsResult.rows[0].value) : fallbackFlock;

    let newStartingFlock = currentStartingFlock;

    if (type === 'addition') {
      newStartingFlock += qty;
    } else if (type === 'reduction' || type === 'sold') {
      newStartingFlock -= qty;
    } else if (type === 'audit') {
      // If it's an audit (a physical recount), the quantity is the absolute number of currently active chickens.
      // active_chickens = starting_flock - total_deaths
      // so new_starting_flock = quantity + total_deaths
      const deathsResult = await client.query(`select coalesce(sum(deaths), 0) as total from daily_logs`);
      const totalDeaths = Number(deathsResult.rows[0].total);
      newStartingFlock = qty + totalDeaths;
    }

    // Update settings table
    await client.query(
      `insert into settings (key, value) values ('starting_flock', $1)
       on conflict (key) do update set value = excluded.value`,
      [newStartingFlock.toString()]
    );

    await client.query('COMMIT');
    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
