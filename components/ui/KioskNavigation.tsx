"use client";

type KioskNavigationProps = {
  onBack: () => void;
  onCancel: () => void;
  backLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
};

export default function KioskNavigation({
  onBack,
  onCancel,
  backLabel = "بازگشت",
  cancelLabel = "لغو عملیات",
  disabled = false,
}: KioskNavigationProps) {
  return (
    <div className="mt-4 flex gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={disabled}
        className="min-h-14
        flex-1
        rounded-2xl
        border
        border-white/30
        bg-white/10
        text-lg
        font-bold
        backdrop-blur-md
        transition-all
        active:scale-[0.98]
        disabled:cursor-not-allowed
        disabled:opacity-40
        "
      >
        {backLabel}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={disabled}
        className="min-h-14
        flex-1
        rounded-2xl
        bg-red-500/80
        text-lg
        font-bold
        text-white
        backdrop-blur-md
        transition-all
        active:scale-[0.98]
        disabled:cursor-not-allowed
        disabled:opacity-40"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
