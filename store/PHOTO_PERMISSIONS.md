# Photo permissions from breeders

Photos used with a breeder's written permission. Check this file before any change to how the app makes money,
before reusing photos anywhere outside the strain catalogue, and before renaming or merging strains.

## Serious Seeds

- Granted: e-mail from the Serious Seeds team, 2026-10-13/14 (reply to miloslav@hribal.site). Media kit sent after we confirm the terms.
- Strains: AK-47, White Russian, Kali Mist, Bubble Gum, Motavation, Chronic (`strains.original_breeder = true`, `breeder_url` = their strain page).
- Terms:
  - Credit every photo to Serious Seeds with a direct link to the strain page on seriousseeds.com (`strain_photos.author` = "Serious Seeds", `source_url` = strain page).
  - Serious Seeds clearly shown as the original breeder (strain page shows "original breeder" linking `breeder_url`).
  - Only in the BudBuddy strain catalogue, only for their strains. Never for other breeders' or seed banks' strains with the same name, never in the problem atlas, AI training, ads or store listing.
  - Cropping allowed only if the full plant/bud stays visible (`strain_photos.fit = 'contain'`, padded thumbnails). No changes to lighting, contrast or colour.
  - No sharing or sublicensing to third parties.
  - Free, non-commercial app only. **Before any paid feature launches, e-mail them and get approval, or remove the photos.**
  - Ownership stays with Serious Seeds; permission can be withdrawn at any time (then delete their rows from `strain_photos` and the files in Storage `media/catalog/<slug>/`).
