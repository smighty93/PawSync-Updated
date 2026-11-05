import { Cat, Dog, PawPrint } from "lucide-react";
export default function PetPortrait({ pet }) {
  const species = (pet.species || "").toLowerCase();
  const Icon = species === "dog" ? Dog : species === "cat" ? Cat : PawPrint;
  return <div className={`ps-pet-portrait ps-pet-${species === "cat" ? "cat" : "other"}`} aria-label={`${pet.name}, ${pet.species || "pet"}`}><Icon size={48} strokeWidth={1.25}/><span>{pet.species || "Your companion"}</span></div>;
}
