const express = require("express");
const bcrypt = require("bcryptjs");
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
      "select id, full_name, email, role, is_active, created_at from users order by created_at"
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
       returning id, full_name, email, role, is_active, created_at`,
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

const updateUserSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["owner", "employee"]).optional(),
});

// PUT /users/:id - Owner updates any user's profile
router.put("/:id", requireAuth, requireOwner, validate(updateUserSchema), async (req, res) => {
  const { full_name, email, role } = req.body;
  try {
    const { rows } = await pool.query(
      `update users set full_name=$1, email=$2, role=COALESCE($3, role) where id=$4
       returning id, full_name, email, role, is_active, created_at`,
      [full_name, email.toLowerCase(), role, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Email already in use" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /users/me - User updates their own profile
router.put("/me", requireAuth, async (req, res) => {
  const { full_name, email } = req.body;
  if (!full_name || !email) {
    return res.status(400).json({ message: "Name and email are required" });
  }
  try {
    const { rows } = await pool.query(
      `update users set full_name=$1, email=$2 where id=$3
       returning id, full_name, email, role, is_active, created_at`,
      [full_name, email.toLowerCase(), req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Email already in use" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /users/:id - Owner only, permanently delete user
router.delete("/:id", requireAuth, requireOwner, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: "Cannot delete yourself" });
  }
  try {
    const { rowCount } = await pool.query("delete from users where id = $1", [
      req.params.id,
    ]);
    if (rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    if (err.code === "23503") {
      return res.status(409).json({
        message: "Cannot delete user: they are still referenced by other records",
      });
    }
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
