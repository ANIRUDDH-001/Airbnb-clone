import clsx from "clsx";

interface AvatarProps {
  name: string;
  src: string | null;
  size?: number;
  className?: string;
}

/** Round profile photo, falling back to the initial on a dark disc (as the live site does). */
export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- external avatar hosts, served as-is
    return <img src={src} alt={name} style={style} className={clsx("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span
      style={{ ...style, fontSize: size * 0.42 }}
      className={clsx("grid shrink-0 place-items-center rounded-full bg-ink font-semibold text-white", className)}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
