import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

function sanitizeFolder(folder: string | null) {
  if (!folder) return "financepro";
  return folder.replace(/[^a-zA-Z0-9/_-]/g, "").slice(0, 80) || "financepro";
}

export async function POST(request: Request) {
  if (!process.env.CLOUDINARY_URL) {
    return NextResponse.json({ error: "CLOUDINARY_URL no está configurado." }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = sanitizeFolder((formData.get("folder") as string | null) ?? null);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  cloudinary.config({ secure: true });

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("No se pudo subir la imagen"));
          return;
        }
        resolve({ secure_url: uploadResult.secure_url });
      }
    );

    uploadStream.end(buffer);
  });

  return NextResponse.json({ url: result.secure_url });
}
