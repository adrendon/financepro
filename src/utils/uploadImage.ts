type UploadImageOptions = {
  onProgress?: (percentage: number) => void;
};

export async function uploadImage(file: File, folder: string, options: UploadImageOptions = {}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const data = await new Promise<{ url?: string; error?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload-image");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percentage = Math.round((event.loaded / event.total) * 100);
      options.onProgress?.(percentage);
    };

    xhr.onerror = () => {
      reject(new Error("No se pudo subir la imagen. Verifica tu conexión e intenta de nuevo."));
    };

    xhr.onload = () => {
      const parsed = (xhr.responseText ? JSON.parse(xhr.responseText) : {}) as {
        url?: string;
        error?: string;
      };

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed);
        return;
      }

      reject(
        new Error(
          parsed.error ||
            "No se pudo subir la imagen. Configura CLOUDINARY_URL en .env.local y reinicia el servidor."
        )
      );
    };

    xhr.send(formData);
  });

  if (!data.url) {
    throw new Error(
      data.error ||
        "No se pudo subir la imagen. Configura CLOUDINARY_URL en .env.local y reinicia el servidor."
    );
  }

  return data.url;
}
