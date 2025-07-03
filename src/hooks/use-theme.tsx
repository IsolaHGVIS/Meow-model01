
import { useTheme as useNextTheme } from "next-themes";

export function useTheme() {
  const { theme, setTheme, themes, systemTheme } = useNextTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    themes,
    systemTheme,
    isDark: theme === "dark",
  };
}
