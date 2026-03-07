/* eslint-disable */
// @ts-nocheck
import { odysDb } from "../db/odsy"

export const describeTables = async (): Promise<void> => {
    // const tables = await odysDb.select("TABLE_NAME").from("INFORMATION_SCHEMA.TABLES")
    const tables = [
        "Utilisateur",
        "Activite___",
        "Mandat_____",
        "LienActiviteFrais",
        "Frais______",
        "Compte_____",
        "LienUtilisateurTacheParTarif",
        "Mandat_____",
        "Tarif______",
        "Tache______",
    ]
    const tablesMap = new Map<string, Record<string, string>>()
    for (const table of tables) {
        const fields = await odysDb.raw(`exec sp_columns ${table}`)
        const fieldsMap = fields.reduce((acc: Record<string, string>, f: any) => {
            acc[f.COLUMN_NAME] = f.TYPE_NAME
            return acc
        }, {})
        tablesMap.set(table, fieldsMap)
    }
    console.log(JSON.stringify(Object.fromEntries(tablesMap), null, 2))
}
describeTables()
