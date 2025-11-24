import express from "express";
import { registerRoutes } from "./server/routes.ts";
import http from "http";

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
registerRoutes(app);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "API server running" });
});

const port = parseInt(process.env.PORT || '8032', 10);
server.listen({
  port,
  host: "0.0.0.0",
}, () => {
  console.log(`✅ API server running on port ${port}`);
  console.log(`📍 http://localhost:${port}`);
});
