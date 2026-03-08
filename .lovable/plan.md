

## Problem

On Capacitor/Android, pages like Index, Login, Signup, and AIChatbot can be scrolled beyond their bounds, revealing a blank white/black bar in the navigation bar area. This breaks the edge-to-edge experience.

## Root Cause

These pages use `min-h-screen` or `h-screen` but don't lock scrolling with `overflow-hidden` and `fixed` positioning. The global `body` has `overflow: hidden` and `position: fixed`, but the inner page containers themselves are still scrollable, allowing overscroll on Capacitor's WebView.

## Fix

Apply `fixed inset-0 overflow-hidden` to the outermost container of each affected page, making them truly viewport-locked. For pages with internal scrollable content (AIChatbot messages), only the inner scroll area should scroll.

### Changes per file:

**1. `src/pages/Index.tsx`**
- Wizard view: Change `min-h-screen` to `fixed inset-0 overflow-hidden` on the outer `motion.div`
- Login screen view: Same change — `fixed inset-0 overflow-hidden` instead of `min-h-screen`

**2. `src/pages/Login.tsx`**  
- Change outer `div` from `min-h-screen w-full flex flex-col relative overflow-hidden` to `fixed inset-0 flex flex-col overflow-hidden`

**3. `src/pages/Signup.tsx`**
- Same pattern — outer container becomes `fixed inset-0 overflow-hidden` with internal content using `overflow-y-auto` for the form area only

**4. `src/pages/AIChatbot.tsx`**
- Change outer `div` from `h-screen` to `fixed inset-0` — it already has `overflow-hidden` and flex layout, so the messages area scrolls internally via `overflow-y-auto`

This ensures no page can be dragged beyond its bounds on Capacitor, eliminating the visible bar underneath.

