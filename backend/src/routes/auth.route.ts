import { Hono } from "hono";
import {
  google,
  googleCallback,
  me,
  signin,
  signup,
} from "../controllers/auth.controller";

const auth = new Hono();

auth.post('/signup', (c) => signup(c))
auth.post('/signin', (c) => signin(c))
auth.get('/me', (c) => me(c))

auth.get('/google', (c) => google(c))

auth.get('/google/callback', (c) => googleCallback(c))

export default auth;