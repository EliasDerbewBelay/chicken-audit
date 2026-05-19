const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth, requireOwner } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

const createUserSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["owner", "employee"]).default("employee"),
});

// GET /users — owner only, list all users (no passwords)
router.get("/", requireAuth, requireOwner, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "select id, full_name, email, role, created_at from users order by created_at"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /users — owner only, create a new user account
router.post("/", requireAuth, requireOwner, validate(createUserSchema), async (req, res) => {
  const { full_name, email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `insert into users (full_name, email, password, role)
       values ($1, $2, $3, $4)
       returning id, full_name, email, role, created_at`,
      [full_name, email.toLowerCase(), hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Email already in use" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /users/:id/password — owner can reset anyone's password; employee can reset own
router.put("/:id/password", requireAuth, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }
  if (req.params.id !== req.user.id && req.user.role !== "owner") {
    return res.status(403).json({ message: "Not authorized" });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query("update users set password=$1 where id=$2", [hash, req.params.id]);
    res.json({ message: "Password updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
