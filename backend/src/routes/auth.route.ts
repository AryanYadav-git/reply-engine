import { Hono } from "hono";
import { google, googleCallback, register } from "../controllers/auth.controller";

const auth = new Hono();

auth.get('/register', (c) => register(c))

auth.get('/google', (c) => google(c))

auth.get('/google/callback', (c) => googleCallback(c))

export default auth;