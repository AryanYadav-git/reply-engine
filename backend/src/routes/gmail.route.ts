import { Hono } from "hono";
import { gmailWebhook } from "../controllers/gmail.controller";

const gmail = new Hono();

gmail.post("/webhook", (c) => gmailWebhook(c));

export default gmail;
