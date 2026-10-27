import { getChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  displayName: string;
  isSimulatedDevUser: boolean;
}

/**
 * Retrieves the current authenticated user on the server.
 * Uses ChatGPT headers in production and supports simulated user in local development.
 */
export async function getAuthUser(): Promise<AuthenticatedUser | null> {
  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    return {
      userId: chatGPTUser.userId,
      email: chatGPTUser.email,
      displayName: chatGPTUser.displayName,
      isSimulatedDevUser: false,
    };
  }

  // In local development or testing environments, provide a simulated developer user
  const isDev =
    process.env.NODE_ENV !== 'production' ||
    process.env.ALLOW_DEV_AUTH === 'true' ||
    process.env.VITEST === 'true';

  if (isDev) {
    const devUserId = process.env.DEV_USER_ID || 'dev-user-001';
    return {
      userId: devUserId,
      email: 'dev@local.movie',
      displayName: 'Local Dev User',
      isSimulatedDevUser: true,
    };
  }

  return null;
}
