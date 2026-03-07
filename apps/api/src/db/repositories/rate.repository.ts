import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { db } from "../index"
import { rateClasses } from "../schema"
import type {
    RateClassSchema,
    RateClassCreateInput,
    RateClassUpdateInput,
    ClassSchema,
} from "@beg/validations"

export const rateRepository = {
    findAll: async (years?: number[]): Promise<RateClassSchema[]> => {
        const query = db
            .select({
                id: rateClasses.id,
                class: rateClasses.class,
                year: rateClasses.year,
                amount: rateClasses.amount,
            })
            .from(rateClasses)
            .orderBy(desc(rateClasses.year), asc(rateClasses.class))

        if (years && years.length > 0) {
            query.where(inArray(rateClasses.year, years))
        }

        return await query
    },
    findById: async (id: number) => {
        const results = await db
            .select({
                id: rateClasses.id,
                class: rateClasses.class,
                year: rateClasses.year,
                amount: rateClasses.amount,
            })
            .from(rateClasses)
            .where(eq(rateClasses.id, id))
        return results[0] || null
    },

    findByClassAndYear: async (classType: ClassSchema, year: number) => {
        const results = await db
            .select({
                id: rateClasses.id,
                class: rateClasses.class,
                year: rateClasses.year,
                amount: rateClasses.amount,
            })
            .from(rateClasses)
            .where(and(eq(rateClasses.class, classType), eq(rateClasses.year, year)))
        return results[0] || null
    },

    findByYears: async (years: number[]) => {
        const results = await db
            .select({
                id: rateClasses.id,
                class: rateClasses.class,
                year: rateClasses.year,
                amount: rateClasses.amount,
            })
            .from(rateClasses)
            .where(and(inArray(rateClasses.year, years)))
        return results
    },

    create: async (rateData: RateClassCreateInput): Promise<RateClassSchema> => {
        const [newRate] = await db
            .insert(rateClasses)
            .values({
                class: rateData.class,
                year: rateData.year,
                amount: rateData.amount,
            })
            .returning({
                id: rateClasses.id,
                class: rateClasses.class,
                year: rateClasses.year,
                amount: rateClasses.amount,
            })

        return newRate
    },

    update: async (
        id: number,
        rateData: Partial<RateClassUpdateInput>
    ): Promise<RateClassSchema> => {
        const updateData: Partial<typeof rateClasses.$inferInsert> = {}

        if (rateData.class) updateData.class = rateData.class
        if (rateData.year) updateData.year = rateData.year
        if (rateData.amount !== undefined) updateData.amount = rateData.amount

        const [updatedRate] = await db
            .update(rateClasses)
            .set(updateData)
            .where(eq(rateClasses.id, id))
            .returning({
                id: rateClasses.id,
                class: rateClasses.class,
                year: rateClasses.year,
                amount: rateClasses.amount,
            })

        return updatedRate
    },

    delete: async (id: number): Promise<void> => {
        await db.delete(rateClasses).where(eq(rateClasses.id, id))
    },
}
