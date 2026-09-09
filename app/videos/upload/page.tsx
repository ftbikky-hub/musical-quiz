import { addVideo } from "./actions";

export default function UploadVideoPage() {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>動画を追加</h1>
      <form action={addVideo} style={{ display: "grid", gap: "1rem" }}>
        <label>
          タイトル
          <input name="title" required style={{ width: "100%", padding: "0.5rem" }} />
        </label>
        <label>
          説明(任意)
          <textarea name="description" style={{ width: "100%", padding: "0.5rem" }} />
        </label>
        <label>
          Googleドライブの共有リンク
          <input
            name="driveUrl"
            required
            placeholder="https://drive.google.com/file/d/.../view"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </label>
        <button type="submit" style={{ padding: "0.75rem", fontWeight: "bold" }}>
          追加する
        </button>
      </form>
    </main>
  );
}
