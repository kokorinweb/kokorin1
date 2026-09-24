import { Hero } from "@/components/Hero";
import { Catalog } from "@/components/Catalog";
import { Works } from "@/components/Works";
import { BriefSection } from "@/components/BriefSection";
import { Contacts } from "@/components/Contacts";
import { aiConfigured } from "@/lib/ai";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Catalog />
      <Works />
      {/* Без ключа помощник собирает тот же бриф по заранее заданным вопросам. */}
      <BriefSection aiEnabled={aiConfigured()} />
      <Contacts />
    </>
  );
}
