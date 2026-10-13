"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

const MAX_PHOTOS = 8;
const MAX_FILE_BYTES = 8_000_000;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type LocalPhoto = { url: string; name: string };

/** Temporary, user-selected photos. Files and object URLs never leave this tab. */
export function ListingPhotoPicker() {
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [message, setMessage] = useState("");
  const urls = useRef<string[]>([]);

  useEffect(() => () => {
    urls.current.forEach(url => URL.revokeObjectURL(url));
    urls.current = [];
  }, []);

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const available = MAX_PHOTOS - photos.length;
    const valid = selected.filter(file => IMAGE_TYPES.has(file.type) && file.size <= MAX_FILE_BYTES);
    const added = valid.slice(0, available).map(file => ({ url: URL.createObjectURL(file), name: file.name }));
    urls.current.push(...added.map(photo => photo.url));
    setPhotos(previous => [...previous, ...added]);
    setMessage(selected.length !== added.length
      ? `Added ${added.length} photo${added.length === 1 ? "" : "s"}. Select up to eight JPEG, PNG, or WebP files under 8 MB each.`
      : "");
    event.target.value = "";
  }

  function removePhoto(url: string) {
    URL.revokeObjectURL(url);
    urls.current = urls.current.filter(item => item !== url);
    setPhotos(previous => previous.filter(photo => photo.url !== url));
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="font-semibold text-slate-900">Vehicle photos</h2>
      <p className="mt-1 text-sm text-slate-600">
        If AutoTrader blocks the import, save photos from the listing and select them here. They stay in this browser tab and disappear when it closes.
      </p>
      <label className="mt-4 inline-block text-sm font-medium text-brand-700" htmlFor="listing-photos">
        Add photos from your device
      </label>
      <input id="listing-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple
        onChange={addPhotos} className="mt-2 block w-full text-sm text-slate-600" />
      {message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}
      {photos.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {photos.map((photo, index) => (
            <figure key={photo.url} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* Local blob URLs cannot use the Next image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={`Photo ${index + 1} selected for this report`} className="h-48 w-full object-cover" />
              <figcaption className="flex items-center justify-between gap-2 p-2 text-xs text-slate-600">
                <span className="truncate">{photo.name}</span>
                <button type="button" onClick={() => removePhoto(photo.url)} className="font-medium text-brand-700">Remove</button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
