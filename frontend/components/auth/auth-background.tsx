import Image from "next/image";

/**
 * Full-screen auth background — full image visible, no top/bottom crop.
 * Letterbox gaps (if any) use a color matched to the image edges.
 */
export function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-[#b6dff7]">
      <Image
        src="/login-hero.png"
        alt=""
        fill
        priority
        className="object-contain object-center"
        sizes="100vw"
      />
    </div>
  );
}
