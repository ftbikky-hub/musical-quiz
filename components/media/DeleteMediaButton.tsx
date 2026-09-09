"use client";

export function DeleteMediaButton({
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
        if (!confirm("削除しますか?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs text-red-600 hover:underline">
        削除
      </button>
    </form>
  );
}
