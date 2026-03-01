export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <span style={{ fontSize: '3rem' }}>🔍</span>
      <h1 style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>
        Page not found
      </h1>
      <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
        We couldn&apos;t find what you were looking for.
      </p>
      <a
        href="/"
        style={{
          marginTop: '1.5rem',
          padding: '0.625rem 1.25rem',
          backgroundColor: '#7C3AED',
          color: 'white',
          borderRadius: '9999px',
          textDecoration: 'none',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        Back to Home
      </a>
    </div>
  );
}
