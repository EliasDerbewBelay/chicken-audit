const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireOwner } = require("../middleware/auth");

const router = express.Router();

// GET /settings - Owner only
router.get("/", requireAuth, requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query("select key, value from settings");
    const settingsObj = {};
    rows.forEach((r) => {
      settingsObj[r.key] = r.value;
    });
    res.json(settingsObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /settings - Owner only
router.put("/", requireAuth, requireOwner, async (req, res) => {
  const { starting_flock } = req.body;
  if (starting_flock === undefined) {
    return res.status(400).json({ message: "Invalid settings data" });
  }

  // Validate starting flock is a positive integer
  const flockNum = parseInt(starting_flock, 10);
  if (isNaN(flockNum) || flockNum < 0) {
    return res.status(400).json({ message: "Starting flock must be a positive number" });
  }

  try {
    await pool.query(
      `insert into settings (key, value) values ('starting_flock', $1)
       on conflict (key) do update set value = excluded.value`,
      [flockNum.toString()]
    );
    res.json({ message: "Settings updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
