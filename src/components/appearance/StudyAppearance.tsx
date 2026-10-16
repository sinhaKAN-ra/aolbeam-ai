"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const STUDY_STYLES = [
  {
    id: "calm",
    name: "Calm",
    description: "Warm paper, forest green, room to think.",
    color: "#28745e",
  },
  {
    id: "colorful",
    name: "Colorful",
    description: "Playful violet with a little extra energy.",
    color: "#8054d4",
  },
  {
    id: "focus",
    name: "Focus",
    description: "Cool blue and a crisp, minimal workspace.",
    color: "#3b75cb",
  },
] as const;
type StudyStyle = (typeof STUDY_STYLES)[number]["id"];
const AppearanceContext = createContext({
  style: "calm" as StudyStyle,
  setStyle: (_style: StudyStyle) => {},
});

export function StudyAppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [style, updateStyle] = useState<StudyStyle>("calm");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aolbeam-study-style");
      if (STUDY_STYLES.some((item) => item.id === saved))
        updateStyle(saved as StudyStyle);
    } catch {
      /* Storage can be disabled in private browsing. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.studyStyle = style;
  }, [style]);
  const setStyle = (value: StudyStyle) => {
    updateStyle(value);
    try {
      localStorage.setItem("aolbeam-study-style", value);
    } catch {
      /* Preference still works for this visit. */
    }
  };
  return (
    <AppearanceContext.Provider value={{ style, setStyle }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function AppearancePicker({ expanded = false }: { expanded?: boolean }) {
  const { style, setStyle } = useContext(AppearanceContext);
  const { theme, setTheme } = useTheme();
  if (expanded)
    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {STUDY_STYLES.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={style === item.id}
              onClick={() => setStyle(item.id)}
              className={`appearance-option ${style === item.id ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <div className="mb-4 flex h-20 items-center justify-center rounded-xl bg-muted/50">
                <span
                  className="h-9 w-9 rounded-xl"
                  style={{ background: item.color }}
                />
                <div className="ml-3 space-y-2">
                  <div className="h-2 w-14 rounded bg-foreground/15" />
                  <div className="h-2 w-9 rounded bg-foreground/10" />
                </div>
              </div>
              <div className="flex items-center justify-between font-semibold">
                {item.name}
                {style === item.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Color mode">
          {[
            { id: "light", label: "Light", icon: Sun },
            { id: "dark", label: "Dark", icon: Moon },
            { id: "system", label: "System", icon: Monitor },
          ].map((mode) => (
            <Button
              key={mode.id}
              type="button"
              variant={theme === mode.id ? "secondary" : "outline"}
              aria-pressed={theme === mode.id}
              onClick={() => setTheme(mode.id)}
            >
              <mode.icon />
              {mode.label}
            </Button>
          ))}
        </div>
      </div>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Customize study appearance"
        >
          <Palette />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Make it your study space</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={style}
          onValueChange={(value) => setStyle(value as StudyStyle)}
        >
          {STUDY_STYLES.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              <span
                className="mr-2 h-3 w-3 rounded-full"
                style={{ background: item.color }}
              />
              {item.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            Use device setting
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
