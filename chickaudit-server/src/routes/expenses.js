const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { canModifyRecord } = require("../middleware/ownership");
const { validate } = require("../middleware/validate");

const router = express.Router();

const expenseSchema = z.object({
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(["feed","medicine","vaccine","wage","utilities","equipment","other"]),
  amount_etb: z.number().positive(),
  supplier: z.string().nullable().optional(),
});

// GET /expenses
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      select e.*, u.full_name as recorded_by_name
      from expenses e
      join users u on u.id = e.recorded_by
      order by e.expense_date desc, e.created_at desc
      limit 100
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /expenses
router.post("/", requireAuth, validate(expenseSchema), async (req, res) => {
  const { expense_date, category, amount_etb, supplier } = req.body;
  try {
    const { rows } = await pool.query(
      `insert into expenses (recorded_by, expense_date, category, amount_etb, supplier)
       values ($1,$2,$3,$4,$5) returning *`,
      [req.user.id, expense_date, category, amount_etb, supplier ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /expenses/:id
router.put("/:id", requireAuth, validate(expenseSchema), async (req, res) => {
  const { expense_date, category, amount_etb, supplier } = req.body;
  try {
    const existing = await pool.query("select recorded_by from expenses where id=$1", [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ message: "Expense not found" });
    if (!canModifyRecord(req.user, existing.rows[0].recorded_by)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { rows } = await pool.query(
      `update expenses set expense_date=$1,category=$2,amount_etb=$3,supplier=$4
       where id=$5 returning *`,
      [expense_date, category, amount_etb, supplier ?? null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /expenses/:id — owner or entry creator
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await pool.query("select recorded_by from expenses where id=$1", [
      req.params.id,
    ]);
    if (!existing.rows[0]) return res.status(404).json({ message: "Expense not found" });
    if (!canModifyRecord(req.user, existing.rows[0].recorded_by)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { rowCount } = await pool.query("delete from expenses where id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
