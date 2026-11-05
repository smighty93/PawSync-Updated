import { Cat, Dog, PawPrint } from "lucide-react";
import { supabase } from "../../lib/supabase";

/**
 * Resolves a storage path to a public URL.
 * photo_url may be:
 *   - a full https:// URL (already resolved)
 *   - a storage path like "pet-photos/abc.jpg"
 */
function resolvePhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http")) return photoUrl;
  const { data } = supabase.storage.from("pet-photos").getPublicUrl(photoUrl);
  return data?.publicUrl || null;
}

export default function PetPortrait({ pet, className = "" }) {
  const species = (pet.species || "").toLowerCase();
  const Icon = species === "dog" ? Dog : species === "cat" ? Cat : PawPrint;
  const photoUrl = resolvePhotoUrl(pet.photo_url);

  return (
    <div
      className={`ps-pet-portrait ps-pet-${species === "cat" ? "cat" : "other"} ${className}`}
      aria-label={`${pet.name}, ${pet.species || "pet"}`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={pet.name}
          className="absolute inset-0 w-full h-full object-cover object-top rounded-[14px]"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <Icon size={48} strokeWidth={1.25} />
      )}
      <span>{pet.species || "Your companion"}</span>
    </div>
  );
}
