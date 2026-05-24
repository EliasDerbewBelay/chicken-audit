const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { canModifyRecord } = require("../middleware/ownership");
const { validate } = require("../middleware/validate");

const router = express.Router();

const saleSchema = z.object({
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["eggs", "broiler"]),
  quantity: z.number().positive(),
  amount_etb: z.number().positive(),
  buyer: z.string().nullable().optional(),
});

// GET /sales
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      select s.*, u.full_name as recorded_by_name
      from sales s
      join users u on u.id = s.recorded_by
      order by s.sale_date desc, s.created_at desc
      limit 100
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /sales
router.post("/", requireAuth, validate(saleSchema), async (req, res) => {
  const { sale_date, type, quantity, amount_etb, buyer } = req.body;
  try {
    const { rows } = await pool.query(
      `insert into sales (recorded_by, sale_date, type, quantity, amount_etb, buyer)
       values ($1,$2,$3,$4,$5,$6) returning *`,
      [req.user.id, sale_date, type, quantity, amount_etb, buyer ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /sales/:id — owner or creator
router.put("/:id", requireAuth, validate(saleSchema), async (req, res) => {
  const { sale_date, type, quantity, amount_etb, buyer } = req.body;
  try {
    const existing = await pool.query("select recorded_by from sales where id=$1", [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ message: "Sale not found" });
    if (!canModifyRecord(req.user, existing.rows[0].recorded_by)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { rows } = await pool.query(
      `update sales set sale_date=$1,type=$2,quantity=$3,amount_etb=$4,buyer=$5
       where id=$6 returning *`,
      [sale_date, type, quantity, amount_etb, buyer ?? null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /sales/:id — owner or entry creator
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await pool.query("select recorded_by from sales where id=$1", [
      req.params.id,
    ]);
    if (!existing.rows[0]) return res.status(404).json({ message: "Sale not found" });
    if (!canModifyRecord(req.user, existing.rows[0].recorded_by)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { rowCount } = await pool.query("delete from sales where id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: "Sale not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
