export default function ErrorScreen({ message, onRetry }) {
  return (
    <div className="error-screen">
      <div className="error-icon">⛈️</div>
      <h2>Couldn't load weather</h2>
      <p>{message}</p>
      <button
        onClick={onRetry || (() => window.location.reload())}
        className="error-retry"
      >
        Try Again
      </button>
    </div>
  );
}
