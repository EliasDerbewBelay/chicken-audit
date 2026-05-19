"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language } from "./translations";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem("chickaudit-lang") as Language;
    if (stored === "en" || stored === "am") {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("chickaudit-lang", lang);
  };

  // Avoid hydration mismatch by waiting for client side render but still provide context
  const content = !isClient ? <div style={{ visibility: 'hidden' }}>{children}</div> : children;

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {content}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
