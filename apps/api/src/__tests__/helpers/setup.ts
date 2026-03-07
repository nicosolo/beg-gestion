import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import * as schema from "../../db/schema"
import { resolve } from "node:path"
import { hashPassword, generateToken } from "../../tools/auth"

export function createTestDb() {
	const sqlite = new Database(":memory:")
	sqlite.exec("PRAGMA foreign_keys = ON")
	const db = drizzle(sqlite, { schema })

	const migrationsFolder = resolve(import.meta.dir, "../../../drizzle")
	migrate(db, { migrationsFolder })

	return { db, sqlite }
}

export type TestDb = ReturnType<typeof createTestDb>["db"]

export async function seedUsers(db: TestDb) {
	const pw = await hashPassword("password123")

	const [superAdmin] = await db
		.insert(schema.users)
		.values({
			email: "superadmin@test.com",
			firstName: "Super",
			lastName: "Admin",
			initials: "SA",
			password: pw,
			role: "super_admin",
			archived: false,
		})
		.returning()

	const [admin] = await db
		.insert(schema.users)
		.values({
			email: "admin@test.com",
			firstName: "Admin",
			lastName: "Test",
			initials: "AT",
			password: pw,
			role: "admin",
			archived: false,
		})
		.returning()

	const [user] = await db
		.insert(schema.users)
		.values({
			email: "user@test.com",
			firstName: "User",
			lastName: "Test",
			initials: "UT",
			password: pw,
			role: "user",
			archived: false,
		})
		.returning()

	return {
		superAdmin,
		admin,
		user,
		superAdminToken: generateToken(superAdmin),
		adminToken: generateToken(admin),
		userToken: generateToken(user),
	}
}

export { schema }
