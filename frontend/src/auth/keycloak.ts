import Keycloak from "keycloak-js";

export const keycloak = new Keycloak({
  url: "http://localhost:8080",
  realm: "crash-game",
  clientId: "crash-game-client",
});

export interface UserInfo {
  playerId: string;
  username: string;
  token: string;
}

export async function initKeycloak(): Promise<UserInfo | null> {
  try {
    const authenticated = await keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
    });
    if (!authenticated) return null;
    return {
      playerId: keycloak.tokenParsed?.sub || "",
      username: keycloak.tokenParsed?.preferred_username || "player",
      token: keycloak.token || "",
    };
  } catch {
    return null;
  }
}

export async function login(): Promise<void> {
  await keycloak.login({ redirectUri: window.location.origin + "/game" });
}

export async function logout(): Promise<void> {
  await keycloak.logout({ redirectUri: window.location.origin });
}

export function getToken(): string | undefined {
  return keycloak.token;
}

export function updateToken(): Promise<boolean> {
  return keycloak.updateToken(30);
}
