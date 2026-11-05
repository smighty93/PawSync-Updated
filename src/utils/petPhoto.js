import { supabase } from "../lib/supabase";

export function getPetPhoto(photoPath) {
  if (!photoPath) return "/default-pet.png";

  const { data } = supabase.storage
    .from("pet-photos")
    .getPublicUrl(photoPath);

  return data.publicUrl;
}