const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const User = require("../models/user");
cloudinary.config({
  cloud_name: "dwdhzw1oa",
  api_key: "862726479597383",
  api_secret: "SYHESldGIlANUd-zg1hMt7B-V0k", // Click 'View API Keys' above to copy your API secret
});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "avatars", // Folder in Cloudinary to store images
    allowedFormats: ["jpg", "png"],
  },
});

const upload = multer({ storage: storage });
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
    const { username, password, avatar } = req.body;
    try {
      let user = await User.findOne({ username });
      if (user) {
        return res.status(400).json({ msg: "User already exists" });
      }
      let avatarUrl = "";
      if (avatar && avatar.startsWith("data:image/")) {
        const base64Data = avatar.split(",")[1]; // Get the base64 string part
        const buffer = Buffer.from(base64Data, "base64"); // Decode the base64 string

        // Upload to Cloudinary
        const uploadResponse = cloudinary.uploader.upload_stream(
          { resource_type: "image" },
          async (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              return res.status(500).json({ msg: "Error uploading image" });
            }
            avatarUrl = result.secure_url; // Get the URL of the uploaded image
            user = new User({
              username,
              password: await bcrypt.hash(password, 10),
              photo: avatarUrl,
            });
            await user.save();
            res.status(201).json({ msg: "User registered successfully" });
          }
        );

        // Create a readable stream from the buffer
        const stream = require("stream");
        const readableStream = new stream.PassThrough();
        readableStream.end(buffer);
        readableStream.pipe(uploadResponse);
      }
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
    res.status(200).json({ token, username: user.username, photo: user.photo });
  } catch (err) {
    res.status(500).send("Server error");
  }
});
module.exports = router;
