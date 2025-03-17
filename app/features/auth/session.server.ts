import { createCookieSessionStorage } from '@remix-run/node'

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is not set!")
}

export type UserSessionData = {
  id: number;
  has_setup_completed: boolean;
};

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '_session',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
})

export const { getSession, commitSession, destroySession } = sessionStorage


export async function createUserSession(
  request: Request,
  userData: UserSessionData
): Promise<string> {
  const session = await getSession(request.headers.get("Cookie"));

  session.set("userId", userData.id);
  session.set("hasSetupCompleted", userData.has_setup_completed);

  return commitSession(session);
}

export async function getUserSession(request: Request): Promise<UserSessionData | null> {
  const session = await getSession(request.headers.get("Cookie"));

  const userId = session.get("userId");
  if (!userId) return null;

  return {
    id: Number(userId),
    has_setup_completed: Boolean(session.get("hasSetupCompleted")),
  };
}

export async function clearUserSession(request: Request): Promise<string> {
  const session = await getSession(request.headers.get("Cookie"));

  // Remove all user-related fields
  session.unset("userId");
  session.unset("hasSetupCompleted");

  return commitSession(session);
}