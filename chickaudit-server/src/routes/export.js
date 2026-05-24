const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireOwner } = require("../middleware/auth");

const router = express.Router();

function arrayToCsv(data) {
  if (!data || !data.length) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        let val = row[header];
        if (val === null || val === undefined) val = "";
        const strVal = String(val);
        // Escape quotes and wrap in quotes if contains comma
        if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

router.get("/logs", requireAuth, requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select l.id, l.log_date, l.eggs_collected, l.feed_given_kg, l.notes, u.full_name as logged_by_name, l.created_at
       from daily_logs l
       left join users u on l.logged_by = u.id
       order by l.log_date desc`
    );
    const csv = arrayToCsv(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="daily_logs.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/sales", requireAuth, requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select s.id, s.sale_date, s.type, s.quantity, s.amount_etb, s.buyer, u.full_name as recorded_by_name, s.created_at
       from sales s
       left join users u on s.recorded_by = u.id
       order by s.sale_date desc`
    );
    const csv = arrayToCsv(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="sales.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/expenses", requireAuth, requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select e.id, e.expense_date, e.category, e.amount_etb, e.supplier, u.full_name as recorded_by_name, e.created_at
       from expenses e
       left join users u on e.recorded_by = u.id
       order by e.expense_date desc`
    );
    const csv = arrayToCsv(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="expenses.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
