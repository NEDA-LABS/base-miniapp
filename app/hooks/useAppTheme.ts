"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Reliable theme hook that waits for hydration before resolving.
 * Always use this instead of useTheme() directly to avoid hydration mismatches.
 */
export function useAppTheme() {
  // Force light mode only
  return { isLight: true, mounted: true };
}
