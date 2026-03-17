export default function GlobalLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <div className="flex items-end gap-[5px] h-8">
        {[0.55, 0.85, 1, 0.75, 0.45].map((scale, i) => (
          <div
            key={i}
            style={{
              width: "4px",
              height: `${Math.round(scale * 28)}px`,
              background: "var(--ts-accent)",
              borderRadius: "2px",
              transformOrigin: "bottom",
              animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>
    </div>
  );
}
