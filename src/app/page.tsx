import { Hero } from "@/components/home/Hero";
import {
  About,
  Advantages,
  BookingTeaser,
  Chef,
  Contacts,
  Events,
  FinalCta,
  HowItWorks,
  Interior,
  MenuTeaser,
  Popular,
  Reviews,
  Sets,
} from "@/components/home/Sections";
import { Certificates } from "@/components/home/Certificates";
import { CartBar } from "@/components/CartBar";
import { RESTAURANT, siteUrl } from "@/lib/restaurant";

/** Часы работы «на сегодня» меняются раз в сутки — часа кеша более чем достаточно. */
export const revalidate = 3600;

/** Разметка для поисковиков и карточек: ресторан, адрес, часы, рейтинг. */
function structuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: RESTAURANT.name,
    url: siteUrl(),
    telephone: RESTAURANT.phone,
    email: RESTAURANT.email,
    servesCuisine: "Японская",
    priceRange: "₽₽",
    address: {
      "@type": "PostalAddress",
      streetAddress: RESTAURANT.address.replace("Москва, ", ""),
      addressLocality: "Москва",
      addressCountry: "RU",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: RESTAURANT.coords.lat,
      longitude: RESTAURANT.coords.lon,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: RESTAURANT.rating.score,
      reviewCount: RESTAURANT.rating.count,
    },
    acceptsReservations: `${siteUrl()}/booking`,
  };
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
      />

      <Hero />
      <Popular />
      <MenuTeaser />
      <HowItWorks />
      <BookingTeaser />
      <Sets />
      <Advantages />
      <About />
      <Chef />
      <Interior />
      <Events />
      <Reviews />
      <Certificates />
      <Contacts />
      <FinalCta />
      <CartBar />
    </>
  );
}
