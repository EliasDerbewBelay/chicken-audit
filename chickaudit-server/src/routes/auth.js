const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /auth/login
router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    const { rows } = await pool.query(
      "select id, full_name, email, password, role from users where email = $1",
      [email.toLowerCase()]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "Server misconfigured" });
    }
    const token = jwt.sign(
      { id: user.id, full_name: user.full_name, role: user.role },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      token,
      user: { id: user.id, full_name: user.full_name, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /auth/me — verify token and return current user
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "select id, full_name, email, role, created_at from users where id = $1",
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
