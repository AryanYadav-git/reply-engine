import { Context } from "hono";
import { exchangeCodeForToken, getGoogleAuthUrl } from "../services/google-auth.service";

export const register = async (c: Context) => {
    return c.text('Register');
}

export const google = async (c: Context) => {
    const googleAuthUrl = getGoogleAuthUrl();
    return c.redirect(googleAuthUrl);
}

export const googleCallback = async (c: Context) => {
    const code = c.req.query('code');
    if(!code){
        c.json({ error: 'No code provided' }, 400);
        return;
    }
    const tokenData = await exchangeCodeForToken(code);
    if(!tokenData){
        c.json({ error: 'Failed to exchange code for token' }, 500);
        return;
    }
    
    return c.json(tokenData);
}
