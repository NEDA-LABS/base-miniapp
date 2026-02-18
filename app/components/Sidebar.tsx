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

export default function Sidebar({ isOpen, onClose, authenticated, onOpenFAQ, onOpenProfile, onOpenTransactions }: SidebarProps) {
  // Close sidebar on escape key
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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 bg-[#0F1419] rounded-l-3xl
        shadow-2xl z-50 w-80 h-full transform transition-transform duration-300 ease-out
        border-l border-slate-800/50
        ${isOpen ? "translate-x-0" : "translate-x-full"}
      `}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-800/50">
          <h2 className="text-xl font-bold text-white">Menu</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-5 space-y-1 h-[calc(100vh-80px)] overflow-y-auto">
          {/* Language Selector */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30 mb-6 hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-xl">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-white font-semibold text-sm">Language</span>
            </div>
            <LanguageSwitcher />
          </div>
          
          {/* Profile Section - When authenticated */}
          {authenticated && (
            <>
              <p className="text-xs text-slate-500 uppercase tracking-wider px-3 pt-2 pb-2 font-bold">Account</p>
              
              <button
                onClick={() => { onClose(); onOpenProfile?.(); }}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-800/40 text-white transition-all group w-full text-left border border-transparent hover:border-slate-700/30"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-colors">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <span className="block font-semibold text-sm">My Profile</span>
                    <span className="text-xs text-slate-400">Volume & Stats</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
              </button>
              
              <div className="border-t border-slate-800/50 my-5"></div>
            </>
          )}
          
          <p className="text-xs text-slate-500 uppercase tracking-wider px-3 pt-2 pb-2 font-bold">Support</p>
          
          {/* FAQ */}
          <button
            onClick={() => { onClose(); onOpenFAQ?.(); }}
            className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-800/40 text-white transition-all group w-full text-left border border-transparent hover:border-slate-700/30"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center bg-slate-800/50 group-hover:bg-slate-700/50 rounded-xl transition-colors">
                <HelpCircle className="w-5 h-5 text-slate-400 group-hover:text-slate-300" />
              </div>
              <span className="font-semibold text-sm">FAQ</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
          </button>
          
          {/* Settings - Always visible when authenticated */}
          {authenticated && (
            <>
              <div className="border-t border-slate-800/50 my-5"></div>
              
              <p className="text-xs text-slate-500 uppercase tracking-wider px-3 pt-2 pb-2 font-bold">Settings</p>
              
              <button
                onClick={() => { onClose(); /* Settings can stay as page or modal */ }}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-800/40 text-white transition-all group w-full text-left border border-transparent hover:border-slate-700/30"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-slate-800/50 group-hover:bg-slate-700/50 rounded-xl transition-colors">
                    <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-300" />
                  </div>
                  <span className="font-semibold text-sm">App Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
              </button>
            </>
          )}
          
          {/* Version Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0F1419] via-[#0F1419] to-transparent">
            <div className="border-t border-slate-800/50 pt-4 text-center">
              <p className="text-xs text-slate-500 font-semibold">NEDApay v1.0.0</p>
              <p className="text-xs text-slate-600 mt-1">© 2025 NEDApay</p>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}