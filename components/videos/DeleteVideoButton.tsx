"use client";

export function DeleteVideoButton({
  id,
  action,
}: {
  id: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("この動画を削除しますか?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        style={{
          color: "#c00",
          fontSize: "0.85rem",
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: 0,
          marginTop: "0.5rem",
        }}
      >
        削除
      </button>
    </form>
  );
}
