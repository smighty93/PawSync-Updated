
import { Cat, Dog, PawPrint } from "lucide-react";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

function resolvePhotoUrl(photoUrl) {
  if (!photoUrl) return null;

  if (photoUrl.startsWith("http")) return photoUrl;

  const { data } = supabase.storage
    .from("pet-photos")
    .getPublicUrl(photoUrl);

  return data?.publicUrl || null;
}

export default function PetPortrait({
  pet,
  className = "",
  compact = false
}) {
  const [imageError, setImageError] = useState(false);

  const species = (pet.species || "").toLowerCase();

  const Icon =
    species === "dog"
      ? Dog
      : species === "cat"
      ? Cat
      : PawPrint;

  const photoUrl = resolvePhotoUrl(pet.photo_url);

  return (
  <div
   className={`ps-pet-portrait ps-pet-${species === "cat" ? "cat" : "other"} relative overflow-hidden rounded-2xl bg-slate-50 flex items-center justify-center ${
  compact
    ? "w-[120px] h-[150px] shrink-0"
    : "w-full h-[240px]"
} ${className}`}
  >
    {photoUrl && !imageError ? (
      <img
        src={photoUrl}
        alt={pet.name}
        className="w-full h-full object-contain"
        onError={() => setImageError(true)}
      />
    ) : (
      <Icon size={64} strokeWidth={1.25} className="text-slate-400" />
    )}

    <span className="absolute bottom-3 right-3 z-10 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600">
      {pet.species || "Your companion"}
    </span>
  </div>
);
}
