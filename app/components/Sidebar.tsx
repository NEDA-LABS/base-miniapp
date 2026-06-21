"use client";

import { useEffect } from "react";
import {
  Settings,
  HelpCircle,
  X,
  Globe,
  User,
  ChevronRight,
} from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  authenticated: boolean;
  onOpenFAQ?: () => void;
  onOpenProfile?: () => void;
  onOpenTransactions?: () => void;
}

const menuItemClass =
  "flex items-center justify-between p-4 rounded-2xl text-[#1C1917] transition-all group w-full text-left border border-transparent hover:bg-[#1C1917]/[0.05] hover:border-[#C8C1B4]/60";

const iconWrapClass =
  "w-10 h-10 flex items-center justify-center bg-[#E6DECD] border border-[#C8C1B4]/50 rounded-xl group-hover:bg-[#E4DDD3] transition-colors";

export default function Sidebar({
  isOpen,
  onClose,
  authenticated,
  onOpenFAQ,
  onOpenProfile,
}: SidebarProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-[#1C1917]/40 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      <div
        className={`
        fixed top-0 right-0 bg-[#EDE8DF] rounded-l-3xl
        shadow-[0_20px_48px_rgba(0,0,0,0.12)] z-50 w-80 h-full transform transition-transform duration-300 ease-out
        border-l border-[#C8C1B4]
        ${isOpen ? "translate-x-0" : "translate-x-full"}
      `}
      >
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#C8C1B4]">
          <h2 className="text-xl font-bold text-[#1C1917] tracking-tight">Menu</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#E4DDD3] border border-[#C8C1B4] text-[#7C7468] hover:text-[#1C1917] hover:bg-[#DDD7CD] transition-all"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="relative p-5 space-y-1 h-[calc(100vh-80px)] overflow-y-auto">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-[#F4EFE6] to-[#E2D9C8] ring-1 ring-inset ring-black/[0.03] border border-transparent [box-shadow:0_4px_20px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.6)_inset] mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[#EDE8DF] border border-[#C8C1B4]/50 rounded-xl">
                <Globe className="w-5 h-5 text-[#2563EB]" />
              </div>
              <span className="text-[#1C1917] font-semibold text-sm">Language</span>
            </div>
            <LanguageSwitcher />
          </div>

          {authenticated && (
            <>
              <p className="text-xs text-[#7C7468] uppercase tracking-wider px-3 pt-2 pb-2 font-mono font-semibold">
                Account
              </p>

              <button
                onClick={() => {
                  onClose();
                  onOpenProfile?.();
                }}
                className={menuItemClass}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-[#C8C1B4]/50 rounded-xl group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-colors">
                    <User className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div className="flex-1">
                    <span className="block font-semibold text-sm text-[#1C1917]">My Profile</span>
                    <span className="text-xs text-[#7C7468] font-mono">Volume & Stats</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7C7468] group-hover:text-[#1C1917] transition-colors" />
              </button>

              <div className="border-t border-[#C8C1B4] my-5" />
            </>
          )}

          <p className="text-xs text-[#7C7468] uppercase tracking-wider px-3 pt-2 pb-2 font-mono font-semibold">
            Support
          </p>

          <button
            onClick={() => {
              onClose();
              onOpenFAQ?.();
            }}
            className={menuItemClass}
          >
            <div className="flex items-center space-x-3">
              <div className={iconWrapClass}>
                <HelpCircle className="w-5 h-5 text-[#7C7468] group-hover:text-[#1C1917]" />
              </div>
              <span className="font-semibold text-sm">FAQ</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7C7468] group-hover:text-[#1C1917] transition-colors" />
          </button>

          {authenticated && (
            <>
              <div className="border-t border-[#C8C1B4] my-5" />

              <p className="text-xs text-[#7C7468] uppercase tracking-wider px-3 pt-2 pb-2 font-mono font-semibold">
                Settings
              </p>

              <button
                onClick={() => {
                  onClose();
                }}
                className={menuItemClass}
              >
                <div className="flex items-center space-x-3">
                  <div className={iconWrapClass}>
                    <Settings className="w-5 h-5 text-[#7C7468] group-hover:text-[#1C1917]" />
                  </div>
                  <span className="font-semibold text-sm">App Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7C7468] group-hover:text-[#1C1917] transition-colors" />
              </button>
            </>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#EDE8DF] via-[#EDE8DF] to-transparent">
            <div className="border-t border-[#C8C1B4] pt-4 text-center">
              <p className="text-xs text-[#7C7468] font-mono font-semibold">NEDApay v1.0.0</p>
              <p className="text-xs text-[#7C7468]/80 mt-1 font-mono">© 2025 NEDApay</p>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
