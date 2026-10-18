import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { AccountPicker } from "@/components/account-picker";

export default async function SignInPage() {
  const user = await currentUser();
  if (user) redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-[560px] flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="font-serif text-2xl font-semibold">Ajaia Docs</div>
          <h1 className="text-lg font-medium text-[#22282A]">
            Pick a seeded account to continue
          </h1>
          <p className="text-sm leading-relaxed text-[#3A4240]">
            Demo authentication: no passwords, no sign-up. Each account already owns documents,
            and one document is shared between accounts so the access model can be tested in two
            browser windows.
          </p>
        </div>

        <AccountPicker users={users} />

        <p className="font-mono text-xs text-[#4A5250]">
          Signing in sets a signed, HTTP-only cookie holding the account id. Nothing else is
          stored about the session.
        </p>
      </div>
    </main>
  );
}
