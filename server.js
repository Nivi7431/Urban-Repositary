require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express(); // Removed the extra "a"

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
};
connectDB();

// User Schema
const UserSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, unique: true, required: true },
    password: String,
});

const User = mongoose.model("User", UserSchema);

// Payment Schema
const PaymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    paymentMethod: { type: String, required: true },
    accountNumber: { type: String, required: true },
    cvv: { type: String }, // CVV is optional for UPI
    date: { type: Date, default: Date.now }
});

const Payment = mongoose.model("Payment", PaymentSchema);

// Signup Route
app.post("/signup", async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({ firstName, lastName, email, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: "User created successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error creating user: " + err.message });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({ message: "Login successful", token, userId: user._id });
    } catch (err) {
        res.status(500).json({ message: "Error logging in: " + err.message });
    }
});

// Payment Route
app.post("/payment", async (req, res) => {
    try {
        console.log("Payment request received:", req.body);

        const { userId, paymentMethod, accountNumber, cvv } = req.body;

        if (!userId || !paymentMethod || !accountNumber) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        let hashedCVV = null;
        if (cvv && paymentMethod !== "UPI") {
            hashedCVV = await bcrypt.hash(cvv, 10);
        }

        const maskedAccountNumber =
            accountNumber.length > 4
                ? accountNumber.slice(0, -4).replace(/\d/g, "*") + accountNumber.slice(-4)
                : accountNumber;

        const newPayment = new Payment({
            userId,
            paymentMethod,
            accountNumber: maskedAccountNumber,
            cvv: hashedCVV,
        });

        await newPayment.save();

        console.log("Payment recorded successfully in DB");
        res.status(201).json({ message: "Payment successful" });
    } catch (err) {
        console.error("Payment processing error:", err);
        res.status(500).json({ message: "Error processing payment: " + err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
