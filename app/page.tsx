import { SiteHeader } from "@/components/SiteHeader";
import { Studio } from "@/components/Studio";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Studio />
      </main>
    </>
  );
}
