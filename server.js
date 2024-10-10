const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

require("dotenv").config();
//username = rahulshaik185
//password = 0DofhRXvjTndCgkN

const authRoutes = require("./Routes/auth");
const messagesch = require("./models/Messages");
const User = require("./models/user");
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
  socket.on("join", async ({ username }) => {
    console.log(`${username} has joined`);
    if (username) {
      const user = await User.findOne({ username });
      onlineUsers[socket.id] = {
        id: user._id,
        name: user.username,
        photo: user.photo,
      };
      io.emit("online_users", Object.values(onlineUsers));
      const messages = await messagesch.find({
        $or: [{ sender: username }, { receiver: username }],
      });
      io.to(socket.id).emit("message_history", messages);
    }
  });

  socket.on(
    "send_message",
    async ({ sender, receiver, message, timestamp }) => {
      console.log(sender, message, receiver);
      const targetSocketId = Object.keys(onlineUsers).find(
        (id) => onlineUsers[id].name === receiver
      );

      let messagecon = new messagesch({ sender, receiver, message, timestamp });
      await messagecon.save();

      if (targetSocketId) {
        io.to(targetSocketId).emit("receive_message", {
          sender,
          message,
          timestamp,
        });
      }
    }
  );
  socket.on("disconnect", () => {
    console.log(`${onlineUsers[socket.id]?.name} has left`);
    delete onlineUsers[socket.id];
    io.emit("online_users", Object.values(onlineUsers));
  });
});

server.listen(process.env.PORT, () => {
  console.log("server is running on port 5000");
});
