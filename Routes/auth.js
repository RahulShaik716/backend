const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const User = require("../models/user");

const router = express.Router();
router.post(
  "/register",
  [
    check("username").not().isEmpty().withMessage("Username is required"),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    const { username, password } = req.body;
    try {
      let user = await User.findOne({ username });
      if (user) {
        return res.status(400).json({ msg: "User already exists" });
      }
      user = new User({
        username,
        password: await bcrypt.hash(password, 10),
      });
      await user.save();
      res.status(201).json({ msg: "User registered successfully" });
    } catch (err) {
      res.status(500).send("Server errror");
    }
  }
);

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });
    const payload = { user: { id: user.id, username: user.username } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({ token, username: user.username });
  } catch (err) {
    res.status(500).send("Server error");
  }
});
module.exports = router;
