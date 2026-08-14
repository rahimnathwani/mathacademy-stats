interface PageStatusProps {
  /** The page's container class, so status screens match the page's styling. */
  className: string;
  loading: boolean;
  error: string | null;
}

/** Loading / error / no-data screen shared by every report page. */
export function PageStatus({ className, loading, error }: PageStatusProps) {
  if (loading) {
    return (
      <div className={className}>
        <h1>Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <h1>Error</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h1>No Activities</h1>
      <p>No activities available to display.</p>
    </div>
  );
}
