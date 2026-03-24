import * as jose from "jose";

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET is required (use a long random string, e.g. openssl rand -base64 32)"
    );
  }
  return new TextEncoder().encode(secret);
};

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
};

export async function signSessionToken(user: {
  id: number;
  email: string;
  name: string;
}): Promise<string> {
  const key = getSecretKey();
  return new jose.SignJWT({
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifySessionToken(token: string) {
  const key = getSecretKey();
  const { payload } = await jose.jwtVerify(token, key);
  const sub = payload.sub;
  if (!sub || typeof payload.email !== "string" || typeof payload.name !== "string") {
    throw new Error("Invalid token payload");
  }
  return {
    userId: Number(sub),
    email: payload.email,
    name: payload.name,
  };
}
