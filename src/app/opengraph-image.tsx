import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Topsnip — Search any topic. Skip the noise.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#080808",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "35%",
            transform: "translate(-50%, -50%)",
            width: "800px",
            height: "600px",
            background:
              "radial-gradient(ellipse, rgba(124,106,247,0.10) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Signal mark — background decoration, top right */}
        <div
          style={{
            position: "absolute",
            top: "60px",
            right: "80px",
            display: "flex",
            gap: "14px",
            alignItems: "flex-end",
            opacity: 0.06,
          }}
        >
          {[130, 170, 210, 160, 120].map((h, i) => (
            <div
              key={i}
              style={{
                width: "40px",
                height: `${h}px`,
                background: "#7C6AF7",
                borderRadius: "8px",
              }}
            />
          ))}
        </div>

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            fontSize: "88px",
            fontWeight: 800,
            letterSpacing: "-3px",
            marginBottom: "24px",
          }}
        >
          <span style={{ color: "#F0F0F0" }}>top</span>
          <span style={{ color: "#7C6AF7" }}>snip</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "28px",
            color: "#A0A0A0",
            fontWeight: 400,
            letterSpacing: "-0.5px",
            marginBottom: "40px",
          }}
        >
          Search any topic. Skip the noise.
        </div>

        {/* Divider */}
        <div
          style={{
            width: "320px",
            height: "1px",
            background: "#202020",
            marginBottom: "20px",
          }}
        />

        {/* Sub-copy */}
        <div style={{ fontSize: "20px", color: "#555555" }}>
          AI &amp; automation · YouTube distilled · No tabs required
        </div>

        {/* URL — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "80px",
            fontSize: "18px",
            color: "#383838",
            fontWeight: 500,
          }}
        >
          topsnip.co
        </div>
      </div>
    ),
    { ...size }
  );
}
