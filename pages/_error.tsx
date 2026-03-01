import type { NextPageContext } from 'next';

interface ErrorProps {
  statusCode: number;
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <span style={{ fontSize: '3rem' }}>{statusCode === 404 ? '🔍' : '⚠️'}</span>
      <h1 style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>
        {statusCode === 404 ? 'Page not found' : `Error ${statusCode}`}
      </h1>
      <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
        {statusCode === 404
          ? "We couldn't find what you were looking for."
          : 'Something went wrong. Please try again.'}
      </p>
      <a href="/" style={{ marginTop: '1.5rem', padding: '0.625rem 1.25rem', backgroundColor: '#7C3AED', color: 'white', borderRadius: '9999px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
        Back to Home
      </a>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode ?? 500 : 404;
  return { statusCode };
};

export default ErrorPage;
