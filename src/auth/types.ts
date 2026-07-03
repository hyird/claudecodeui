import type { ReactNode } from 'react';

export type AuthUser = {
  id: number;
  username: string;
};

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string };

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type AuthGateRenderProps = {
  token: string;
  user: AuthUser;
  logout: () => Promise<void>;
};

export type AuthGateProps = {
  children: (props: AuthGateRenderProps) => ReactNode;
};
