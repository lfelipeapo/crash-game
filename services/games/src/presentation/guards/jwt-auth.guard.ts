import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface UserContext {
  playerId: string;
  username: string;
  email?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  private getJwks() {
    if (!this.jwks) {
      const keycloakUrl = process.env.KEYCLOAK_URL ?? "http://keycloak:8080";
      const realm = process.env.KEYCLOAK_REALM ?? "crash-game";
      const jwksUri = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`;
      this.jwks = createRemoteJWKSet(new URL(jwksUri));
    }
    return this.jwks;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7);

    try {
      const { payload } = await jwtVerify(token, this.getJwks(), {
        clockTolerance: 60,
      });

      const playerId = payload.sub;
      const username = payload.preferred_username ?? payload.name ?? "player";

      if (!playerId) {
        throw new UnauthorizedException("Invalid token: missing sub claim");
      }

      request.user = {
        playerId,
        username,
        email: payload.email as string | undefined,
      } as UserContext;

      return true;
    } catch (error) {
      this.logger.warn(`JWT verification failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new UnauthorizedException("Invalid token");
    }
  }
}
