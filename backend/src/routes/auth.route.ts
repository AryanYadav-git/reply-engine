import { Hono } from "hono";
import { register } from "../controllers/auth.controller";

const auth = new Hono();

auth.get('/register', (c) => register(c))

export default auth;