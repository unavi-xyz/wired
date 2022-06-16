import Spinner from "./Spinner";

export type ButtonVariant =
  | "elevated"
  | "filled"
  | "tonal"
  | "outlined"
  | "text";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  color?: "primary" | "tertiary";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  squared?: "large" | "small" | undefined;
  children: React.ReactNode;
}

export default function Button({
  variant = "text",
  color = "primary",
  loading = false,
  disabled = false,
  fullWidth = false,
  squared,
  children,
  ...rest
}: Props) {
  const textClass =
    variant === "text"
      ? color === "primary"
        ? "hover:bg-primaryContainer hover:text-onPrimaryContainer"
        : "hover:bg-tertiaryContainer hover:text-onTertiaryContainer"
      : "";

  const outlineClass =
    variant === "outlined"
      ? color === "primary"
        ? `ring-1 ring-outline hover:ring-onPrimaryContainer
           hover:text-onPrimaryContainer hover:bg-primaryContainer`
        : `ring-1 ring-outline hover:ring-onTertiaryContainer
           hover:text-onTertiaryContainer hover:bg-tertiaryContainer`
      : null;

  const tonalClass =
    variant === "tonal" ? "bg-primaryContainer text-onPrimaryContainer" : null;

  const filledClass =
    variant === "filled"
      ? color === "primary"
        ? "bg-primary text-onPrimary"
        : "bg-tertiary text-onTertiary"
      : null;

  const elevatedClass =
    variant === "elevated"
      ? "shadow-dark bg-surface text-primary hover:bg-surfaceVariant/50"
      : null;

  const disabledClass =
    loading || disabled
      ? "opacity-50 cursor-not-allowed"
      : variant === "text"
      ? "active:bg-opacity-75"
      : variant === "outlined"
      ? "active:bg-opacity-75"
      : variant === "filled"
      ? "hover:shadow-filled hover:bg-opacity-90 active:bg-opacity-75"
      : variant === "tonal"
      ? "hover:shadow-tonal hover:bg-opacity-90 active:bg-opacity-75"
      : null;

  const loadingClass = loading ? "opacity-0" : null;
  const fullWidthClass = fullWidth ? "w-full" : null;
  const squaredClass =
    squared === "small"
      ? "rounded"
      : squared === "large"
      ? "rounded-xl"
      : "rounded-full";

  return (
    <button
      className={`relative flex items-center justify-center transition font-bold
                  px-4 py-1.5 ${disabledClass} ${fullWidthClass} ${squaredClass}
                  ${textClass} ${outlineClass} ${tonalClass} ${filledClass} ${elevatedClass}`}
      {...rest}
    >
      <div className={`w-full ${loadingClass}`}>{children}</div>
      {loading && (
        <div className="absolute">
          <Spinner />
        </div>
      )}
    </button>
  );
}
