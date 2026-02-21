"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function addTransaction(formData: FormData) {
  const supabase = await createClient();
  const merchant = formData.get("merchant") as string;
  const category = formData.get("category") as string;
  const amountStr = formData.get("amount") as string;
  const type = formData.get("type") as string; // 'income' or 'expense'
  const date = formData.get("date") as string;

  if (!merchant || !category || !amountStr || !type || !date) {
    return { error: "Todos los campos son obligatorios" };
  }

  const amount = parseFloat(amountStr);

  if (isNaN(amount)) {
    return { error: "El monto debe ser un número válido" };
  }

  const { error } = await supabase.from("transactions").insert([
    {
      merchant,
      category,
      amount,
      type,
      date,
    },
  ]);

  if (error) {
    console.error("Error al insertar transacción:", error);
    return { error: "Hubo un error al guardar la transacción" };
  }

  // Revalidar la página principal para que refleje los nuevos datos al instante
  revalidatePath("/");

  return { success: true };
}
