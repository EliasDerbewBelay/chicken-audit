import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2D6A4F",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 14,
            height: 18,
            borderRadius: 999,
            background: "#F8F6F1",
            marginTop: 4,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
