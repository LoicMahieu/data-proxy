import { SignJWT, errors, jwtVerify } from "jose";

export interface JwtSignOptions {
  algorithm?: "HS256" | "HS384" | "HS512";
  expiresIn?: string | number;
  notBefore?: string | number;
  audience?: string | string[];
  issuer?: string;
  jwtid?: string;
  subject?: string;
  noTimestamp?: boolean;
}

const hs256SecretKey = (secret: string) => new TextEncoder().encode(secret);

const isJwtError = (err: unknown): boolean =>
  err instanceof errors.JWTExpired ||
  err instanceof errors.JWTInvalid ||
  err instanceof errors.JWSInvalid ||
  err instanceof errors.JWSSignatureVerificationFailed ||
  err instanceof errors.JWTClaimValidationFailed;

export const verifyHs256Jwt = async (
  token: string,
  secret: string,
): Promise<Record<string, unknown> | undefined> => {
  try {
    const { payload } = await jwtVerify(token, hs256SecretKey(secret), {
      algorithms: ["HS256", "HS384", "HS512"],
    });
    return payload;
  } catch (err) {
    if (isJwtError(err)) {
      return undefined;
    }
    throw err;
  }
};

export const signHs256Jwt = async (
  payload: Record<string, unknown>,
  secret: string,
  signOptions?: JwtSignOptions,
): Promise<string> => {
  const alg = signOptions?.algorithm ?? "HS256";
  const jwt = new SignJWT(payload).setProtectedHeader({ alg });

  if (!signOptions?.noTimestamp) {
    jwt.setIssuedAt();
  }
  if (signOptions?.expiresIn !== undefined) {
    jwt.setExpirationTime(signOptions.expiresIn);
  }
  if (signOptions?.notBefore !== undefined) {
    jwt.setNotBefore(signOptions.notBefore);
  }
  if (signOptions?.audience !== undefined) {
    jwt.setAudience(signOptions.audience);
  }
  if (signOptions?.issuer !== undefined) {
    jwt.setIssuer(signOptions.issuer);
  }
  if (signOptions?.jwtid !== undefined) {
    jwt.setJti(signOptions.jwtid);
  }
  if (signOptions?.subject !== undefined) {
    jwt.setSubject(signOptions.subject);
  }

  return jwt.sign(hs256SecretKey(secret));
};
