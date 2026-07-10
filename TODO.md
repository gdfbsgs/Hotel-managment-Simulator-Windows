# TODO - Hotel / Residences mode

- [ ] Update `src/components/Onboarding.tsx` to add Building Type selector (Hotel vs Residences).
- [ ] Extend `src/store.ts` onboarding state with `buildingType`, `residenceName`, and routing behavior for residences.
- [ ] Update `src/store.ts` guest check-in / check-out logic so **reception is optional** in residences mode.
- [ ] Update `src/App.tsx` copy (milestone share + header label) to display Residence(s) when in residences mode.
- [ ] Ensure local/cloud save still works (store payload includes buildingType + residence name/location).
- [ ] Smoke test: create Hotel -> works unchanged; create Residences without placing reception -> game runs.

