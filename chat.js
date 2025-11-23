// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import Message from "./models/Message.js";
import ChatSession from "./models/ChatSession.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ✅ MongoDB connection
mongoose
  .connect(
    "mongodb://serveaso:serveaso@98.130.50.75:27017/?authSource=admin",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

const activeSessions = new Set(); // sessions that already triggered alert
const chatList = {}; // { sessionId: { sessionId, userName, lastMessage, updatedAt } }

// 🔹 Load existing sessions from DB on server start
(async () => {
  try {
    const sessions = await ChatSession.find().sort({ updatedAt: -1 }).lean();
    sessions.forEach((s) => {
      chatList[s.sessionId] = {
        sessionId: s.sessionId,
        userName: s.userName,
        lastMessage: s.lastMessage,
        updatedAt: s.updatedAt,
      };
    });
    console.log(`✅ Loaded ${sessions.length} sessions from DB`);
  } catch (err) {
    console.error("❌ Error loading sessions:", err);
  }
})();

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.joinedSessions = new Set();
  socket.userData = {};

  // 📌 Admin joins global admin room
  socket.on("joinAdminRoom", ({ userName, userId }) => {
    socket.join("admins");
    socket.userData = { userName, userId, role: "admin" };
    console.log(`🛡️ Admin ${userName} joined global admin room`);

    // Send full chat list
    socket.emit("chatListUpdate", Object.values(chatList));

    // Send alerts for any active sessions
    activeSessions.forEach((sessionId) => {
      const chat = chatList[sessionId];
      if (chat) {
        socket.emit("newChatAlert", {
          sessionId: chat.sessionId,
          from: chat.userName,
          fromId: "unknown",
          preview: chat.lastMessage,
          startedAt: chat.updatedAt,
        });
      }
    });
  });

  // 📌 Admin accepts chat
  socket.on("acceptChat", async ({ sessionId, userName, userId }) => {
    if (!socket.joinedSessions.has(sessionId)) {
      socket.join(sessionId);
      socket.joinedSessions.add(sessionId);
    }
    socket.userData.sessionId = sessionId;

    console.log(`✅ Admin accepted chat with ${userName} (${sessionId})`);

    await updateChatList(sessionId, userName, "Chat started by admin");
  });

  // 📌 User/Admin starts chat
  socket.on("startChat", async ({ sessionId, userName, userId, role }) => {
    console.log(`🆕 [NEW CHAT] ${userName} (${userId}, Role: ${role}) in ${sessionId}`);

    if (!socket.joinedSessions.has(sessionId)) {
      socket.join(sessionId);
      socket.joinedSessions.add(sessionId);
    }
    socket.userData = { sessionId, userName, userId, role };

    await updateChatList(sessionId, userName, "Started a chat");

    // Notify admins
    io.to("admins").emit("newChatAlert", {
      sessionId,
      from: userName,
      fromId: userId,
      preview: "Started a chat",
      startedAt: new Date().toISOString(),
    });
  });

  // 📌 Join an existing session
  socket.on("joinSession", ({ sessionId, userName, userId, role }) => {
    if (!socket.joinedSessions.has(sessionId)) {
      socket.join(sessionId);
      socket.joinedSessions.add(sessionId);
    }
    socket.userData = { sessionId, userName, userId, role };
    console.log(`🛋️ ${userName} joined session: ${sessionId}`);
  });

  // 📌 Send message
  socket.on("sendMessage", async (data) => {
    const message = { ...data, createdAt: new Date() };
    console.log(
      `📩 [MESSAGE] ${message.senderName} (${message.senderId}) in ${message.sessionId}: "${message.message}"`
    );

    try {
      // ✅ Save message in MongoDB
      await Message.create(message);
    } catch (err) {
      console.error("❌ Error saving message:", err);
    }

    // First message? Trigger alert
    if (!activeSessions.has(message.sessionId)) {
      activeSessions.add(message.sessionId);

      io.to("admins").emit("newChatAlert", {
        sessionId: message.sessionId,
        from: message.senderName,
        fromId: message.senderId,
        preview: message.message,
        startedAt: new Date().toISOString(),
      });
    }

    await updateChatList(message.sessionId, message.senderName, message.message);

    // Emit to other users in session
    socket.to(message.sessionId).emit("receiveMessage", message);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    logAdminCount();
  });

  // 🔹 Update chat list in memory & DB
  async function updateChatList(sessionId, userName, lastMessage) {
    const update = {
      sessionId,
      userName,
      lastMessage,
      updatedAt: new Date(),
    };

    chatList[sessionId] = update;

    try {
      await ChatSession.findOneAndUpdate({ sessionId }, update, {
        upsert: true,
        new: true,
      });
    } catch (err) {
      console.error("❌ Error saving session:", err);
    }

    sendChatListToAdmins();
  }

  // 🔹 Send chat list to all admins
  function sendChatListToAdmins() {
    const admins = getSocketsInRoom("admins");
    console.log(`📤 Sending chat list to ${admins.length} admin(s)`);
    io.to("admins").emit("chatListUpdate", Object.values(chatList));
  }

  function getSocketsInRoom(room) {
    return Array.from(io.sockets.adapter.rooms.get(room) || []);
  }

  function logAdminCount() {
    const admins = getSocketsInRoom("admins");
    console.log(`📊 Admins connected: ${admins.length}`);
  }
});

server.listen(5000, () => console.log("🚀 Server running on port 5000"));
