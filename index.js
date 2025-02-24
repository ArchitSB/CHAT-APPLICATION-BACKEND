const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const { Server } = require("socket.io");
const Messages = require('./models/Messages');
const User = require('./models/User');


dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
    }
});


app.use(cors());
app.use(express.json());


mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Mongodb Connected."))
    .catch((error) => {
        console.error("MongoDB connection error:",error);
        process.exit(1);
    });

app.use("/auth", authRoutes);

//socket io logic
io.on("connection", (socket) => {
    console.log("User connected", socket.id);

    socket.on("send_message", async(data) => {
        try{
            const {sender, receiver, message} = data;
            const newMessage = new Messages({
                sender, 
                receiver, 
                message,
                timestamp: new Date(),
            });
            await newMessage.save();
            // Emit to all connected clients except sender
            socket.broadcast.emit("receive_message", {
                sender,
                receiver,
                message,
                _id: newMessage._id,
                timestamp: newMessage.timestamp
            });
            // Emit to the sender only
            socket.emit("message_sent", {
                sender,
                receiver,
                message,
                _id: newMessage._id,
                timestamp: newMessage.timestamp
            });
        }catch(error){
            console.error("Error saving message:", error);
            socket.emit("message_error", { error: "Failed to send message" });
        }
    });

    socket.on ("disconnect", () =>{
        console.log("User disconnected", socket.id);
    })
});

app.get("/messages", async(req,res) => {
    const {sender, receiver} = req.query;

    if (!sender || !receiver) {
        return res.status(400).json({ message: "Sender and receiver are required" });
    }

    try{
        const messages = await Messages.find({
            $or: [
                {sender, receiver}, 
                {sender: receiver, receiver: sender},
            ],
        }).sort({timestamp: 1})
        .select('-__v');

        res.json(messages);
    }catch(error){
        res.status(500).json({ message: "Error fetching messages"});
    }
});

app.get("/users", async(req,res) => {
    const {currentUser} = req.query;
    try{
        const users = await User.find({ username: {$ne: currentUser}});
        res.json(users);
    }catch(error){
        res.status(500).json({ message: "Error fetching users"});
    }
});


const PORT = process.env.PORT || 5001;
server.listen(PORT, ()=> console.log(`Server listening on port ${PORT}`));
