import { URLSearchParams } from 'url';
import axios from 'axios';

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"

export const getGoogleAuthUrl = () => {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
        response_type: 'code',
        scope: [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ].join(" "),
        access_type: 'offline',
        prompt: 'consent',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export const exchangeCodeForToken = async (code: string) => {
    const res = await axios.post(`https://oauth2.googleapis.com/token`, 
        new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
            grant_type: "authorization_code"
          }),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }
    )
    return res.data;
}

export const getUserInfo = async (accessToken: string) => {
    const res = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return res.data as {
        id: string;
        email: string;
        name?: string;
    };
}