/**
 * ブラウザ側で画像を縮小してJPEGにする(アップロード前の軽量化用)。
 * 長辺 maxDimension px・品質 quality で1枚あたり数百KB程度を目安にする。
 */
export async function resizeImageToJpeg(
  file: File,
  { maxDimension = 1600, quality = 0.8 } = {}
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas の描画コンテキストを取得できませんでした");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) throw new Error("画像の変換に失敗しました");
  return blob;
}
