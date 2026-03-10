import { createFtsTable, rebuildAllProjectSearchIndex } from "./fts"

createFtsTable()
await rebuildAllProjectSearchIndex()
