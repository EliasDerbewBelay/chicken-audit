const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_please_change_in_production");
    req.user = payload; // { id, full_name, role }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireOwner(req, res, next) {
  if (req.user?.role !== "owner") {
    return res.status(403).json({ message: "Owner access required" });
  }
  next();
}

module.exports = { requireAuth, requireOwner };
