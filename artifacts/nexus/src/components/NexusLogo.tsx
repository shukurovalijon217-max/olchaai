import logoImg from "@assets/image_1781005493710.png";

interface NexusLogoProps {
  ringSize?: number;
  showText?: boolean;
  fontSize?: string;
  letterSpacing?: string;
}

export default function NexusLogo({
  ringSize = 48,
  showText = true,
  fontSize = "1.1rem",
  letterSpacing = "0.22em",
}: NexusLogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, userSelect: "none" }}>
      <img
        src={logoImg}
        alt="OlCha"
        width={ringSize}
        height={ringSize}
        style={{
          flexShrink: 0,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
        }}
      />
      {showText && (
        <span style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          letterSpacing,
          fontWeight: 400,
          fontSize,
          background: "linear-gradient(180deg, #d4a96a 0%, #f0c060 30%, #a06030 65%, #6a3a18 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1,
        }}>
          OlCha
        </span>
      )}
    </div>
  );
}
