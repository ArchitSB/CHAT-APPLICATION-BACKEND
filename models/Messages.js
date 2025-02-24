const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
        sender: {
            type: String,
            required: true,
        },
        receiver:{
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        }
},
{ timestamps: true}
);

const Messages =  mongoose.model("Messages", messageSchema);

module.exports = Messages;