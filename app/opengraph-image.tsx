import { ImageResponse } from "next/og";

export const alt = "Material Event Radar — open-source monitor for auditable SEC filing events";
export const size = { width: 1280, height: 640 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "62px 70px",
        color: "#f7f5ef",
        background: "#0b1f2b",
        borderBottom: "12px solid #de5c35",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7, width: 54, height: 58 }}>
            <div style={{ width: 13, height: 26, background: "#f7f5ef" }} />
            <div style={{ width: 13, height: 58, background: "#de5c35" }} />
            <div style={{ width: 13, height: 42, background: "#f7f5ef" }} />
          </div>
          <div style={{ fontSize: 28, letterSpacing: 1 }}>MATERIAL EVENT RADAR</div>
        </div>
        <div style={{ display: "flex", padding: "10px 15px", border: "1px solid #607480", color: "#b7c5ca", fontSize: 17 }}>
          SEC-LINKED DATA
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 980 }}>
        <div style={{ color: "#de8062", fontSize: 18, fontWeight: 700, letterSpacing: 4 }}>OPEN-SOURCE SEC FILING MONITOR</div>
        <div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: 76, lineHeight: 1.04, letterSpacing: -3 }}>
          See what companies disclosed — not why prices moved.
        </div>
        <div style={{ display: "flex", color: "#aec0c7", fontSize: 25, lineHeight: 1.4 }}>
          8-K and 6-K material events, grouped by filing, ranked transparently, and linked to the SEC source.
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {["DEALS", "LEADERSHIP", "DEBT", "OFFERINGS", "AUDIT TRAIL"].map((label) => (
          <div key={label} style={{ display: "flex", padding: "9px 12px", background: "#15313f", color: "#d8e1e3", fontSize: 15, letterSpacing: 2 }}>
            {label}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
