const mongoose = require("mongoose");
const userschema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  photo: { type: String },
});
module.exports = mongoose.model("user", userschema);
