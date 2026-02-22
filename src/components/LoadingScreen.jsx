export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-orb" />
      <p className="loading-text">Fetching the skies…</p>
    </div>
  );
}

export function ErrorScreen({ message, onRetry }) {
  return (
    <div className="error-screen">
      <div className="error-icon">⛈️</div>
      <h2>Couldn't load weather</h2>
      <p>{message}</p>
      <button onClick={onRetry || (() => window.location.reload())} className="error-retry">
        Try Again
      </button>
    </div>
  );
}

export default LoadingScreen;
