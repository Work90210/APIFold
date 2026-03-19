export default function HomePage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '4rem 2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>APIFold</h1>
        <p style={{ fontSize: '1.25rem', color: '#666' }}>
          Turn any REST API into an MCP server. No code required.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>Import a Spec</h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Upload an OpenAPI 3.x or Swagger 2.x spec and APIFold generates MCP tool definitions automatically.
          </p>
          <code style={{ fontSize: '0.8rem', color: '#2563eb' }}>POST /api/specs</code>
        </div>

        <div style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>Configure Servers</h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Set up authentication, rate limits, and connect credentials for your upstream APIs.
          </p>
          <code style={{ fontSize: '0.8rem', color: '#2563eb' }}>GET /api/servers</code>
        </div>

        <div style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>Connect AI Agents</h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Point Claude, Cursor, or any MCP client to your SSE endpoint and start calling tools.
          </p>
          <code style={{ fontSize: '0.8rem', color: '#2563eb' }}>GET /mcp/:slug/sse</code>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0 }}>API Health</h3>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Check the API status at{' '}
          <a href="/api/health" style={{ color: '#2563eb' }}>/api/health</a>
        </p>
      </div>
    </main>
  );
}
