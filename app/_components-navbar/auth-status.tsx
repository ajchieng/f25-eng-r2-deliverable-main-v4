import { Button } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/server-utils";
import Link from "next/link";
import LogoutButton from "./logout-button";
import UserNav from "./user-nav";

export default async function AuthStatus() {
  // Create supabase server component client and obtain authenticated user
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Button asChild>
        <Link href="/login">Log in</Link>
      </Button>
    );
  }

  const { data, error } = await supabase.from("profiles").select().eq("id", user.id);

  if (error || data.length !== 1 || !data[0]) {
    return <LogoutButton />;
  }

  const profileData = data[0];

  return (
    <div className="flex items-center space-x-2">
      <LogoutButton />
      <UserNav profile={profileData} />
    </div>
  );
}
