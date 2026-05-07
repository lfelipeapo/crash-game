import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { jwtVerify, createRemoteJWKSet } from "jose";
import type { UserContext } from "../decorators/current-user.decorator";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://keycloak:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "crash-game";

const JWKS_URL = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private jwks = createRemoteJWKSet(new URL(JWKS_URL));

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid Authorization header");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        clockTolerance: 60,
      });

      const playerId = payload.sub;
      const username = payload.preferred_username as string | undefined;

      if (!playerId) {
        throw new UnauthorizedException("Invalid token: missing sub claim");
      }

      request.user = {
        playerId,
        username: username || "unknown",
      } as UserContext;

      return true;
    } catch (error) {
      this.logger.warn(`JWT verification failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new UnauthorizedException("Invalid token");
    }
  }
}
