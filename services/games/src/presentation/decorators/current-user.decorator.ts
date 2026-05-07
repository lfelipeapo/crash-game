import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { UserContext } from "../guards/jwt-auth.guard";

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserContext;
  },
);
