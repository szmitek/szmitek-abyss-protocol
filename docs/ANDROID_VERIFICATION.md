# Android lifecycle and release checks

## Behavior delivered

- Local checkpoint loading and recovery require an explicit Resume. Background/inactive transitions, Android focus loss (including the notification drawer), and hardware Back pause the session. Confirmed sets persist through the existing serialized snapshot writes.
- Pausing unmounts the workout player and clears its timer callbacks. Incomplete set/countdown timers restart from the full target on resume; rest countdowns are not persisted. Resume asks the Player to return only when ready. Timer completion never records a set automatically.
- A local calendar timer refreshes the dashboard at midnight while foregrounded. A 30-second check also catches device clock/time-zone changes, and foreground return refreshes immediately. Calendar boundaries use local midnight rather than a fixed 24 hours.
- A session from a different local day cannot resume, advance or claim completion. Its checkpoint remains visible until explicitly closed; closing refreshes today's quest, retains completed workout history and awards no XP. This also applies to a session awaiting final feedback: rewards are awarded only when feedback is submitted on the session day.
- Same-step action keys reject duplicate set taps and stale callbacks after a replacement. Completion validates every set, and inconsistent restored cursors require closing the checkpoint.
- Camera denial offers app settings and the Library alternative. Image-only library selection uses the native picker without an upfront broad library permission request.
- Picker, save and delete operations share a synchronous busy guard. Interrupted picker metadata contains view, camera/library source, Player ID and request time. Only the matching Player's request from the previous 24 hours is recoverable; old unscoped pending-view strings are discarded. Saved archive photos are unchanged. Recovery preserves the returned image only, not other unsealed draft photos lost in process death.
- Android Back protects photo drafts and cannot close the archive during a picker/save/delete operation. Pending-request cleanup errors are handled rather than becoming unhandled promise rejections.

Snapshot schema v11, backup format v1 and private storage keys are unchanged. Android version code is 11. No new runtime dependency or network service is added. Session duration remains wall-clock time since starting the session, including same-day pauses; it is not an active-exercise-time measurement.

## Automated evidence

122 domain tests, TypeScript, ESLint and Android export. New coverage: offline checkpoint reload, migration of older snapshots with active sessions, duplicate sets across exercise boundaries, midnight with/without an active session, explicit closing without rewards/history loss, resume safeguards, all-set completion validation, local DST boundaries, timer deadline arithmetic and scoped photo recovery metadata. React review covers listener cleanup, busy/mounted guards and retained draft state. Native APK CI and artifact verification are recorded in GitHub.

## Physical-device verification — not yet performed

Use the standalone release APK and update over the existing installation. Do not uninstall or clear app data.

- [ ] Upgrade: profile, AP, history, cycle reports, Data Vault and private photos survive; cold-launch splash displays the approved Player icon.
- [ ] Offline: airplane-mode cold launch, readiness, quest, exercise guides, set completion and later restart work without Metro or a backend. Library photos stored only in a cloud provider may require connectivity from that provider.
- [ ] Interruption: Home, lock/unlock, notification drawer and Android Back show the checkpoint. Resume requires a tap; no background timer claims a completed set.
- [ ] Process death: terminate after a confirmed set and restart. The last successful storage checkpoint is preserved; a partial set timer starts over. Test again while a save failure banner is visible to confirm it accurately reports unsaved progress.
- [ ] Midnight: leave dashboard open across local midnight; repeat with a paused and running session. Today's scan is required. Yesterday's checkpoint cannot be resumed, and closing it awards no XP.
- [ ] Completion: rapid double taps do not skip sets; after all sets, submit feedback once and verify a single history record.
- [ ] Camera: grant, cancel, deny, permanently deny, open settings, grant and retry. Library remains usable without camera access.
- [ ] Picker destruction: enable Android's "Don't keep activities", capture/select each view, reopen archive, and verify matching view/source recovery. Disable that developer setting afterwards.
- [ ] Photos: try fast repeated source taps, Back with an unsealed draft and failed pending-key cleanup/storage. Existing saved photos remain usable.
- [ ] Data Vault: native export destination, canceled selection, import preview, replace/restart, photos and archived references, pre-import recovery, storage-pressure retry.
- [ ] Layout: 320/360-point screens, large system text and gesture navigation do not clip controls or hide final content.

API references: [React Native AppState](https://reactnative.dev/docs/appstate), [Linking.openSettings](https://reactnative.dev/docs/linking#opensettings), [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/). Release-device behavior cannot be inferred from domain tests alone.


## APK19 body measurements — physical checks pending

- [ ] Update over APK18 without uninstalling or clearing data. Check previous workouts, movement assessments, wellbeing and private photos.
- [ ] Open Progress → Body measurements with an empty history; continue a normal offline workout without entering any measurement.
- [ ] Add weight only, waist only and optional circumferences; missing fields stay blank rather than becoming zero. Restart offline and inspect the retained records.
- [ ] Enter a backdated reading, two readings on one date, decimal comma and decimal point. Confirm chronological history, independent latest weight/waist, and useful validation of zero/invalid/future input.
- [ ] Export and restore both data-only and photo-inclusive Vault backups; confirm body records survive and the documented data-only photo exclusion remains explicit.
- [ ] Test keyboard, scrolling, large text and older-history pagination. Check failed-save/retry behavior before closing the app.

These are device checks, not claims of completed testing. Automated migration/backup/facts/mock checks are recorded in HANDOFF.
