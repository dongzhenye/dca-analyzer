"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (newLocale: "en" | "zh") => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => switchTo("en")}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === "en"
            ? "text-white font-medium"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        EN
      </button>
      <span className="text-zinc-600">/</span>
      <button
        onClick={() => switchTo("zh")}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === "zh"
            ? "text-white font-medium"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        中
      </button>
    </div>
  );
}
