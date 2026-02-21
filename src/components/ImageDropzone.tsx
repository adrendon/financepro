"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_PANEL_IMAGE, isValidImageUrl } from "@/utils/images";

type ImageDropzoneProps = {
  label: string;
  value: string;
  onValueChange: (nextValue: string) => void;
  onFileSelected: (file: File) => void | Promise<void>;
  uploading: boolean;
  uploadProgress?: number;
  defaultImageUrl?: string;
};

export default function ImageDropzone({
  label,
  value,
  onValueChange,
  onFileSelected,
  uploading,
  uploadProgress = 0,
  defaultImageUrl = DEFAULT_PANEL_IMAGE,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const processFile = (file: File | undefined) => {
    if (!file) return;
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalPreviewUrl(URL.createObjectURL(file));
    void onFileSelected(file);
  };

  const normalizedValue = value.trim();
  const isInvalidUrl = !isValidImageUrl(normalizedValue);
  const previewUrl = isInvalidUrl ? localPreviewUrl || defaultImageUrl : normalizedValue || localPreviewUrl || defaultImageUrl;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          const file = event.dataTransfer.files?.[0];
          processFile(file);
        }}
        className={`w-full rounded-lg border-2 border-dashed px-4 py-6 text-sm transition-colors ${
          dragActive
            ? "border-primary bg-primary/5 text-primary"
            : "border-slate-300 dark:border-slate-700 text-slate-500"
        }`}
      >
        Arrastra y suelta una imagen aquí, o haz clic para seleccionar
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => processFile(event.target.files?.[0])}
      />
      <input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Pega o edita una URL de imagen (Cloudinary u otra)"
        className={`w-full px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800 ${
          isInvalidUrl
            ? "border-rose-500 focus:outline-rose-500"
            : "border-slate-300 dark:border-slate-700"
        }`}
      />
      {isInvalidUrl ? (
        <p className="text-xs text-rose-600">La URL no es válida. Debe iniciar con http:// o https://</p>
      ) : null}
      {normalizedValue ? (
        <button
          type="button"
          onClick={() => {
            onValueChange("");
            if (localPreviewUrl) {
              URL.revokeObjectURL(localPreviewUrl);
              setLocalPreviewUrl(null);
            }
          }}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700"
        >
          Quitar imagen
        </button>
      ) : null}
      {previewUrl ? (
        <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover" />
        </div>
      ) : null}
      {uploading ? (
        <div className="space-y-1">
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="text-xs text-slate-500">Subiendo imagen... {uploadProgress}%</p>
        </div>
      ) : null}
    </div>
  );
}
