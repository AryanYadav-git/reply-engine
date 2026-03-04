import { Context } from "hono";

export const register = async (c: Context) => {
    return c.text('Register');
}