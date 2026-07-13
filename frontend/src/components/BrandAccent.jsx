export default function BrandAccent({ className = "" }) {
  return (
    <div className={`relative h-2 w-full overflow-hidden bg-brand-green ${className}`}>
      <div
        className="absolute inset-y-0 left-0 w-32 bg-brand-charcoal sm:w-48"
        style={{ clipPath: "polygon(0 0, 100% 0, 65% 100%, 0 100%)" }}
      />
    </div>
  );
}
