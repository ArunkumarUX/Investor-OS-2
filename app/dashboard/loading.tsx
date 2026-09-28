export default function Loading() {
  return (
    <div className="p-8">
      <div className="shimmer h-8 w-64 rounded-lg mb-3" />
      <div className="shimmer h-4 w-96 rounded mb-8" />
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-24 rounded-xl" />
        ))}
      </div>
      <div className="shimmer h-64 rounded-2xl" />
    </div>
  );
}
