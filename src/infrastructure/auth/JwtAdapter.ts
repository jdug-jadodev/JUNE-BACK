import { SignJWT, jwtVerify } from 'jose';
import type { TokenPort } from '../../domain/ports/out/TokenPort';
import { NoAutenticadoError } from '../../exception/errors';

const DURACION_ACCESS = '7d';

export class JwtAdapter implements TokenPort {
  private readonly secret: Uint8Array;

  constructor(secret: string) {
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado');
    }
    this.secret = new TextEncoder().encode(secret);
  }

  async firmarAccess(usuarioId: string): Promise<string> {
    return new SignJWT({ sub: usuarioId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(DURACION_ACCESS)
      .sign(this.secret);
  }

  async verificarAccess(token: string): Promise<string> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      if (!payload.sub) throw new NoAutenticadoError();
      return payload.sub;
    } catch {
      throw new NoAutenticadoError();
    }
  }

  generarRefresh(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async hashRefresh(refresh: string): Promise<string> {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(refresh),
    );
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
