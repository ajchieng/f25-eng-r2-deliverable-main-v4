import { Separator } from "@/components/ui/separator";
import { TypographyH2, TypographyP } from "@/components/ui/typography";
import { createServerSupabaseClient } from "@/lib/server-utils";

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <TypographyH2>
        Welcome to T4SG <span className="text-green-400">Biodiversity Hub</span>!
      </TypographyH2>
      <TypographyP>
        Biodiversity Hub is a web-app that allows users to post information about different species and stay educated on
        biodiversity across the globe. Users sign into the app and add cards that contain data on the species&apos;
        name, description, population, and more.
      </TypographyP>
      {!user ? <TypographyP>To see the species page, log in in the top right!</TypographyP> : null}
      <Separator className="my-4" />
    </>
  );
}
