import Image from "next/future/image";
import { useEffect, useRef, useState } from "react";

interface Props {
  image?: string | null;
  text?: string | null;
  subtext?: string | null;
  sizes?: string;
  aspect?: "card" | "vertical";
  animateEnter?: boolean;
}

export default function Card({
  image,
  text,
  subtext,
  sizes,
  aspect = "card",
  animateEnter = false,
}: Props) {
  const [visible, setVisible] = useState(!animateEnter);

  useEffect(() => {
    if (!animateEnter) return;
    const timeout = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timeout);
  }, [animateEnter]);

  const aspectCss = aspect === "card" ? "aspect-card" : "aspect-vertical";
  const opacityCss = visible ? "opacity-100" : "opacity-0 translate-y-2";

  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden transition hover:scale-105 hover:cursor-pointer ${opacityCss}`}
    >
      <div
        className={`bg-primaryContainer h-full overflow-hidden rounded-2xl ${aspectCss}`}
      >
        <div className="relative h-full w-full">
          {image && (
            <Image
              src={image}
              priority
              fill
              sizes={sizes}
              draggable={false}
              alt="card image"
              className="rounded-2xl object-cover"
            />
          )}
        </div>
      </div>

      <div className="absolute top-0 left-0 flex h-full items-end px-3 pb-2 tracking-wide text-white">
        {text && (
          <div
            className="drop-shadow-dark overflow-hidden text-xl font-black"
            style={{
              textShadow: "0 0 5px rgba(0, 0, 0, 0.6)",
            }}
          >
            {text}
          </div>
        )}
        {subtext && (
          <div
            className="drop-shadow-dark overflow-hidden text-lg"
            style={{
              textShadow: "0 0 5px rgba(0, 0, 0, 0.6)",
            }}
          >
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
