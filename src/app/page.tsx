import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Cases } from "@/components/Cases";
import { Gallery } from "@/components/Gallery";
import { Process } from "@/components/Process";
import { About } from "@/components/About";
import { Faq } from "@/components/Faq";
import { BriefForm } from "@/components/BriefForm";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

export default function Page() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Services />
        <Cases />
        <Gallery />
        <Process />
        <About />
        <Faq />
        <BriefForm />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
