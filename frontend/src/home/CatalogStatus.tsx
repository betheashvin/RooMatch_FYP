export function CatalogStatus({
  loading,
  error,
  empty,
  className,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  className: string;
}) {
  const message = loading
    ? "Loading furniture..."
    : error
      ? "The catalog is temporarily unavailable. Please try again later."
      : empty
        ? "No furniture is available yet."
        : null;

  return message ? (
    <p role="status" className={className}>
      {message}
    </p>
  ) : null;
}
