const dotDelays = ['0s', '0.15s', '0.3s'];

export default function AuthLoadingScreen() {
  return (
    <main className="auth-screen auth-loading-screen">
      <div className="auth-loading" role="status" aria-live="polite">
        <div className="auth-logo" aria-hidden="true">
          <img src="/logo.svg" alt="" />
        </div>
        <h1>Cloud Terminal</h1>
        <span className="sr-only">正在加载登录状态...</span>
        <div className="auth-loading-dots" aria-hidden="true">
          {dotDelays.map((delay) => (
            <span key={delay} style={{ animationDelay: delay }} />
          ))}
        </div>
      </div>
    </main>
  );
}
