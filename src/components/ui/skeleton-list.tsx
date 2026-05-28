interface SkeletonListProps {
  count?: number;
}

export function SkeletonList({ count = 3 }: SkeletonListProps) {
  return (
    <div className="space-y-3 px-6 py-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label="Loading"
          className="h-14 animate-pulse rounded-md bg-muted"
        />
      ))}
    </div>
  );
}
