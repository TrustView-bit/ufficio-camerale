"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Le due icone sono sempre entrambe nel DOM e vengono alternate dalla classe
  // `dark` sull'html: cosi' il pulsante e' corretto gia' al primo render lato
  // server, senza flash e senza stato di "mounted".
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-10 sm:size-9"
      aria-label="Cambia tema chiaro/scuro"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon className="dark:hidden" aria-hidden />
      <Sun className="hidden dark:block" aria-hidden />
    </Button>
  );
}
