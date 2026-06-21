'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const languages = [
  { code: 'en', name: 'English', initials: 'EN', flag: '🇺🇸' },
  { code: 'sw', name: 'Kiswahili', initials: 'SW', flag: '🇹🇿🇰🇪' }
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
    localStorage.setItem('nedapay-language', languageCode);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-0.5 px-2 py-1 rounded-lg bg-[#E4DDD3] border border-[#C8C1B4] hover:bg-[#DDD7CD] transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        aria-label={t('common.language')}
      >
        <span className="text-[10px]">{currentLanguage.flag}</span>
        <span className="text-[10px] font-bold text-[#1C1917]">
          {currentLanguage.initials}
        </span>
        <ChevronDownIcon className={`w-2.5 h-2.5 text-[#7C7468] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-1 w-24 bg-[#F4EFE6] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.10)] border border-[#C8C1B4] z-20 overflow-hidden">
            <div className="py-0.5">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full text-left px-2 py-1.5 text-[10px] transition-colors duration-150 flex items-center space-x-1 ${
                    currentLanguage.code === language.code
                      ? 'bg-[#1C1917]/[0.06] text-[#1C1917] font-semibold'
                      : 'text-[#7C7468] hover:bg-[#1C1917]/[0.04] hover:text-[#1C1917]'
                  }`}
                >
                  <span className="text-[10px]">{language.flag}</span>
                  <span className="font-bold font-mono">{language.initials}</span>
                  {currentLanguage.code === language.code && (
                    <span className="text-[#2563EB] ml-auto text-[8px]">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
