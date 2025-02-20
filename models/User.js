const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    age: Number,
    email: String,
    password: String,
    dob: String,
    address: String,
    gender: String,
});

module.exports = mongoose.model("User", userSchema);
