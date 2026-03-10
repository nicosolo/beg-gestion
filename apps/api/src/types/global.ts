import type { UserRole } from "@beg/validations"

export type Variables = {
    user: {
        id: number
        email: string
        name: string
        role: UserRole
        firstName: string
        lastName: string
        initials: string
    }
}
