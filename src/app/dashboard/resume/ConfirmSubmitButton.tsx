'use client';

interface ConfirmSubmitButtonProps {
  label: string;
  confirmMessage: string;
  className: string;
}

/**
 * Submit button that asks for confirmation before letting the parent form
 * (bound to a destructive server action) actually run.
 */
export default function ConfirmSubmitButton({
  label,
  confirmMessage,
  className,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}