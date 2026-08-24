# Design system

## Product feeling

The interface should read as a quiet, premium personal development system—dark fantasy through atmosphere, not decoration. Holographic geometry, electric-blue energy, restrained violet accents, and concise system language replace conventional fitness imagery.

## Tokens

| Token | Value | Use |
|---|---:|---|
| Background | `#07090F` | App canvas |
| Raised background | `#0E1320` | Structural surfaces |
| Electric blue | `#29B6FF` | Primary action and active data |
| Deep blue | `#127DFF` | Aura depth |
| Purple | `#6A5CFF` | Rank/identity accent |
| Primary text | `#F3F7FF` | Critical labels and values |
| Secondary text | `#93A4C3` | Supporting copy |
| Danger | `#E23D57` | Trials and genuine warnings |
| Success | `#55E6B1` | Cleared states and readiness |

## Components

- `SystemPanel`: translucent raised surface with one-pixel energy border.
- `GlowButton`: minimum 54 px primary CTA; strong contrast and press state.
- `ProgressBar`: XP, workout, and recovery progress with semantic danger mode.
- `Screen`: consistent system eyebrow, title, safe top spacing, and bottom-nav clearance.
- `BottomNav`: four destinations only—System, Quests, Status, Progress.

## UX rules

- Daily Quest is always the largest dashboard action.
- Starting a fresh workout takes one tap from the dashboard after onboarding.
- Workout controls remain thumb-sized and anchored near the bottom.
- Animation communicates state change; it never delays input.
- System copy is short. Technique cues remain plain and safety-oriented.
- Rank red is reserved for a voluntary trial, never a punishment.
