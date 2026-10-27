import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import type { GridPhoto } from "@/components";
import { hostMessage, useHostActions } from "@/lib/host";
import { STAY_LIMITS } from "@/lib/host-stay-rules";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const L = STAY_LIMITS;

/**
 * The photo list behind `PhotoGrid`: picks from the library, uploads each photo as it is added and tracks its state.
 * `initial` are photos already on the stay (uploaded, `uri` is their thumbnail).
 */
export function usePhotoPicker(initial: GridPhoto[] = []) {
  const { uploadPhoto } = useHostActions();
  const [photos, setPhotos] = useState<GridPhoto[]>(initial);
  const assets = useRef(new Map<string, { assetId?: string; uri: string; mimeType: string }>());
  const [note, setNote] = useState<string | null>(null);

  const patch = (key: string, p: Partial<GridPhoto>) => setPhotos((prev) => prev.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const upload = async (key: string) => {
    const a = assets.current.get(key);
    if (!a) return;
    patch(key, { status: "uploading" });
    const result = await uploadPhoto(a.uri, a.mimeType);
    if (!result.ok) {
      setNote(result.error);
      patch(key, { status: "failed" });
      return;
    }
    const taken = [...assets.current.entries()].some(([k, v]) => k !== key && v.assetId === result.assetId);
    if (taken) {
      assets.current.delete(key);
      setPhotos((prev) => prev.filter((p) => p.key !== key));
      setNote("That photo was already added.");
      return;
    }
    a.assetId = result.assetId;
    patch(key, { status: "done", assetId: result.assetId });
  };

  const onAdd = async () => {
    setNote(null);
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: L.photos.max - photos.length,
      orderedSelection: true,
      quality: 0.7,
      exif: false,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (picked.canceled) return;
    const fresh: GridPhoto[] = [];
    let skipped = 0;
    for (const asset of picked.assets) {
      const mimeType = asset.mimeType ?? "";
      if (!TYPES.includes(mimeType)) {
        skipped++;
        continue;
      }
      const key = `${Date.now()}-${fresh.length}-${Math.random().toString(36).slice(2, 7)}`;
      assets.current.set(key, { uri: asset.uri, mimeType });
      fresh.push({ key, uri: asset.uri, status: "uploading" });
    }
    if (skipped) setNote(hostMessage("unsupported"));
    setPhotos((prev) => [...prev, ...fresh].slice(0, L.photos.max));
    for (const p of fresh) await upload(p.key);
  };

  const onRemove = (key: string) => {
    assets.current.delete(key);
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  };
  const onMakeCover = (key: string) =>
    setPhotos((prev) => {
      const chosen = prev.find((p) => p.key === key);
      return chosen ? [chosen, ...prev.filter((p) => p.key !== key)] : prev;
    });
  const reset = (next: GridPhoto[]) => {
    assets.current.clear();
    // Photos already on the stay count too, so adding one of them again is caught as a duplicate.
    for (const p of next) assets.current.set(p.key, { assetId: p.assetId, uri: p.uri, mimeType: "" });
    setPhotos(next);
    setNote(null);
  };

  return {
    photos,
    note,
    ids: photos.flatMap((p) => (p.status === "done" && p.assetId ? [p.assetId] : [])),
    uploading: photos.some((p) => p.status === "uploading"),
    failed: photos.some((p) => p.status === "failed"),
    onAdd,
    onRemove,
    onRetry: upload,
    onMakeCover,
    reset,
  };
}
