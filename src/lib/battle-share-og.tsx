type BattleShareOgProps = {
  logoUrl: string;
  label?: string;
  subtitle?: string;
};

export function BattleShareOg({
  logoUrl,
  label = "AIPOGER DROP BATTLE",
  subtitle = "AI MUSIC BATTLE ARENA",
}: BattleShareOgProps) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        height: "100%",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#000000",
        color: "#ffffff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          padding: 72,
          textAlign: "center",
        }}
      >
        <img
          src={logoUrl}
          alt=""
          style={{
            height: 330,
            width: 330,
            objectFit: "contain",
          }}
        />
        <div
          style={{
            marginTop: 34,
            color: "#ffffff",
            fontSize: 42,
            fontWeight: 900,
            letterSpacing: 12,
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 18,
            color: "rgba(255,255,255,0.74)",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 7,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
