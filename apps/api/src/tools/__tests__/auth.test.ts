import { describe, test, expect } from "bun:test"
import { hashPassword, comparePassword, generateToken, verifyToken } from "../auth"

const mockUser = {
	id: 1,
	email: "test@example.com",
	role: "admin" as const,
	firstName: "John",
	lastName: "Doe",
	initials: "JD",
	archived: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	activityRates: [],
	collaboratorType: null,
}

describe("hashPassword", () => {
	test("returns bcrypt hash starting with $2b$", async () => {
		const hash = await hashPassword("mypassword")
		expect(hash).toStartWith("$2b$")
		expect(hash).not.toBe("mypassword")
	})
})

describe("comparePassword", () => {
	test("returns true for correct password", async () => {
		const hash = await hashPassword("correct")
		expect(await comparePassword("correct", hash)).toBe(true)
	})

	test("returns false for wrong password", async () => {
		const hash = await hashPassword("correct")
		expect(await comparePassword("wrong", hash)).toBe(false)
	})
})

describe("generateToken", () => {
	test("returns JWT string with 3 dot-separated parts", () => {
		const token = generateToken(mockUser)
		const parts = token.split(".")
		expect(parts).toHaveLength(3)
	})
})

describe("verifyToken", () => {
	test("decodes valid token with correct payload", () => {
		const token = generateToken(mockUser)
		const decoded = verifyToken(token)
		expect(decoded).not.toBeNull()
		expect(decoded!.id).toBe(1)
		expect(decoded!.email).toBe("test@example.com")
		expect(decoded!.role).toBe("admin")
	})

	test("returns null for invalid token", () => {
		expect(verifyToken("invalid.token.value")).toBeNull()
	})

	test("returns null for expired token", () => {
		const token = generateToken(mockUser, "0s")
		// token is already expired at creation with 0s
		const decoded = verifyToken(token)
		expect(decoded).toBeNull()
	})
})
