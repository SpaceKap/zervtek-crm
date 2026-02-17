"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h2>Something went wrong</h2>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              cursor: "pointer",
              borderRadius: "0.375rem",
              border: "1px solid #ccc",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
