import workshop from './journey-content/prism-workshop.mjs';
import citrus from './journey-content/citrus-lane.mjs';
import glass from './journey-content/glass-garden.mjs';
import station from './journey-content/starlight-station.mjs';
import {createJourneyCatalog} from './journey-catalog.mjs';
// New regions are appended here. Preserve published IDs, ordering and puzzle rules.
export const journeyCatalog=createJourneyCatalog([citrus,glass,station,workshop]);
export const chapters=journeyCatalog.chapters;
export const journeyLevels=journeyCatalog.levels;
export const nextJourneyLevel=id=>journeyLevels[id]?.id??null;
export const isJourneyChapterEnd=id=>chapters[journeyLevels[id-1]?.chapter]?.lastLevel===id;
