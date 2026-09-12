# Player UX

Daily Readiness is editable from the System dashboard regardless of today's training/recovery completion. The form takes a detached copy of the current local calendar day's signal. Older entries never prefill a new day. Changes are applied only on sync, and navigation away from a changed draft asks before discarding it.

The domain rejects an edit if the local date changed since the form opened or a workout is active. The form remains open with an error; the Player can return and open a new scan. A correction replaces the same day's readiness entry and adapts the weekly session without compounding volume reductions. Completed workout history and earned progress are retained. Other health, calibration, cycle and equipment gates continue to apply.

Large-font and narrow-screen choices stack vertically. Muscle choices have a 48-point minimum touch height, explanatory text uses 12–14-point sizes, and primary buttons can grow vertically. Navigation text is larger; its height and screen clearance scale together with system font size. Android Back uses the same draft-discard behavior as the visible Return button.

The native splash is configured with [Expo SplashScreen's config plugin](https://docs.expo.dev/versions/latest/sdk/splash-screen/) and the approved `assets/branding/app-icon.png`. Automatic native hiding hands off to the app's Player loading view during storage hydration. There is no fixed launch delay. The actual release splash and native interactions still require physical-device verification; Expo Go is not evidence of the release splash appearance.

Regression coverage includes prefilled warning/muscle values, no mutation of the stored signal, blank next-day drafts, incomplete inputs, same-day replacement, retained older signals, reversible readiness adaptation, health safeguards, completed-day protection and stale-date/active-workout rejection.
