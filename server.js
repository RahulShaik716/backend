const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
require("dotenv").config();
//username = rahulshaik185
//password = 0DofhRXvjTndCgkN
const authRoutes = require("./Routes/auth");
const app = express();
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);
mongoose.connect(process.env.MONGO_URI, {});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
let onlineUsers = {};
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("join", ({ username }) => {
    onlineUsers[socket.id] = username;
    console.log(`${username} has joined`);
    io.emit("online_users", Object.values(onlineUsers));
  });

  socket.on("send_message", ({ sender, receiver, message }) => {
    console.log(sender, message, receiver);
    const targetSocketId = Object.keys(onlineUsers).find(
      (id) => onlineUsers[id] === receiver
    );
    if (targetSocketId) {
      io.to(targetSocketId).emit("receive_message", { sender, message });
    }
    console.log(message);
  });
  socket.on("disconnect", () => {
    console.log(`${onlineUsers[socket.id]} has left`);
    delete onlineUsers[socket.id];
    io.emit("online_users", Object.values(onlineUsers));
  });
});

server.listen(5000, () => {
  console.log("server is running on port 5000");
});
