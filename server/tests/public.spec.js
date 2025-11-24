import express from "express";
import request from "supertest";
import { registerRoutes } from "../routes";

let app;
beforeAll(async () => {
  app = express();
  app.use(express.json());
  await registerRoutes(app);
});

test('GET /api/public/categories returns 200 and JSON', async () => {
  const res = await request(app).get('/api/public/categories');
  expect(res.statusCode).toBe(200);
  expect(res.headers['content-type']).toMatch(/json/);
});

test('GET /api/public/catalog returns 200 and JSON', async () => {
  const res = await request(app).get('/api/public/catalog');
  expect(res.statusCode).toBe(200);
  expect(res.headers['content-type']).toMatch(/json/);
});
