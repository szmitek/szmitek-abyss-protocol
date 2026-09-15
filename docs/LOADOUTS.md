# Home/gym loadouts and machine identity

## Behavior

- Dashboard and Status open PLAYER ARMORY / Loadout. Equipment lists are independent; SAVE & ACTIVATE uses the selected location for upcoming plans until switched again.
- Existing equipment remains unchanged until explicit setup confirmation. The initial draft places it under HOME for review and starts GYM with NONE; old sessions are not retrospectively assigned a location.
- NONE is always present internally as bodyweight capability. The NO EQUIPMENT control clears external gear. Adding machines to the registry never adds them to the equipment list.
- Changes rebuild the weekly contract and available daily plan, preserve completed daily quests/history, and are blocked during an active workout. The general protocol editor updates only the active equipment list.
- Each machine/configuration has an immutable ID, exercise ID, location and user name (up to 60 characters). Changed machines/settings require a new entry. Removal affects future selection; confirmed historical sets retain their identity/name.
- Loaded machine sets can select a registered setup or NOT IDENTIFIED. Changing selection clears the entered kg; subsequent sets of the same exercise reuse the confirmed current-session selection/load. Unsubmitted input is not persisted.
- Historical kg context uses only uniform sessions matching the selected ID, exercise, location and configuration label. Legacy/unidentified and mixed-machine sessions do not provide comparative kg or mastery. Kg convention must remain consistent manually. Machine targets are not inherited from unidentified history; no automatic machine load/rep progression is added.
- The generator still checks equipment, health, movement and readiness; machine registration is not a medical assessment or a starting-weight recommendation.

## Storage and checks

Schema 13, Android versionCode 13. Loadouts remain optional for older profiles. Migration preserves history/checkpoints; Data Vault accepts v11/v12 after original checksum verification. Export/import retains retired machine identities. No dependencies, network services or photo uploads were added.

Local domain tests cover legacy behavior, HOME/GYM switching and replacements, completed-day/active-session guards, profile edits, immutable setup validation, recorded setup resume, same-machine comparisons, non-transfer of machine targets, safety holds, Vault round-trip and mismatched-equipment rejection.

Physical Android checks remain outstanding: open Loadout from Dashboard/Status, edit both lists, configure/name two machines, cancel without saving, switch locations before training, confirm a series on each machine, change selection and verify kg clears, background/kill/resume, inspect history and backup restoration, check keyboard/large-font layout. Existing exercises without motion assets keep textual guidance; animations remain last in the roadmap.
