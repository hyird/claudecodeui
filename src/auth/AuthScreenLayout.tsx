import type { ReactNode } from 'react';

type AuthScreenLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  footerText: string;
};

export default function AuthScreenLayout({
  title,
  description,
  children,
  footerText,
}: AuthScreenLayoutProps) {
  return (
    <main className="auth-screen">
      <div className="auth-shell">
        <section className="auth-card" aria-label={title}>
          <div className="auth-heading">
            <div className="auth-logo" aria-hidden="true">
              <img src="/logo.svg" alt="" />
            </div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="auth-body">{children}</div>

          <footer className="auth-footer">
            <p>{footerText}</p>
          </footer>
        </section>
      </div>
    </main>
  );
}
