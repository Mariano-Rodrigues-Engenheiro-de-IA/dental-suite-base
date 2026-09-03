import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "OdontoGestão — acesso à plataforma" },
      {
        name: "description",
        content: "Acesse o ambiente da sua clínica odontológica ou o painel da plataforma.",
      },
      { property: "og:title", content: "OdontoGestão — acesso à plataforma" },
      {
        property: "og:description",
        content: "Acesse o ambiente da sua clínica odontológica ou o painel da plataforma.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      navigate({ to: data?.role === "platform_admin" ? "/admin" : "/app", replace: true });
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  );
}
