import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongoDB.js";
import connectCloudinary from "./config/cloudinary.js";
import imageRoute from "./routes/imgRoutes.js";

const app = express();
const port = process.env.PORT || 4000;

connectDB();
connectCloudinary();

app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true 
  }));
  

app.use("/api", imageRoute); 

app.get("/", (req, res) => {
  res.send("API WORKING Great");
});

app.listen(port, () => {
  console.log(`Server is listening to port ${port}`);
});
