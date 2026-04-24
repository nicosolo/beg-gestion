import { Hono } from "hono"
import { statusRoutes } from "@src/routes/status"
import { userRoutes } from "@src/routes/user"
import { activityRoutes } from "@src/routes/activity"
import { activityTypeRoutes } from "@src/routes/activityType"
import { projectRoutes } from "@src/routes/project"
import { projectTypeRoutes } from "@src/routes/projectType"
import { rateRoutes } from "@src/routes/rate"
import { clientRoutes } from "@src/routes/client"
import { companyRoutes } from "@src/routes/company"
import { engineerRoutes } from "@src/routes/engineer"
import { invoiceRoutes } from "@src/routes/invoice"
import { locationRoutes } from "@src/routes/location"
import { workloadRoutes } from "@src/routes/workloads"
import unbilledRoutes from "@src/routes/unbilled"
import { vatRateRoutes } from "@src/routes/vatRate"
import { monthlyHoursRoutes } from "@src/routes/monthlyHours"
import { auditLogRoutes } from "@src/routes/auditLog"
import { collaboratorGroupRoutes } from "@src/routes/collaboratorGroup"
import { PORT, DB_FILE_PATH } from "@src/config"
import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { existsSync } from "node:fs"
import { errorHandler } from "@src/tools/error-handler"
import { runMigrations } from "./db/migrate"
import { startHourlySnapshots, stopHourlySnapshots } from "@src/tools/snapshot"

// Ensure SQLite database directory exists
const dbDir = dirname(DB_FILE_PATH)
if (!existsSync(dbDir)) {
    await mkdir(dbDir, { recursive: true })
    console.log(`Created database directory: ${dbDir}`)
}

// Run database migrations
// Temporarily disabled due to migration conflict
await runMigrations()

const app = new Hono()
    .onError(errorHandler)
    .route("/user", userRoutes)
    .route("/status", statusRoutes)
    .route("/activity", activityRoutes)
    .route("/activity-type", activityTypeRoutes)
    .route("/project", projectRoutes)
    .route("/project-type", projectTypeRoutes)
    .route("/rate", rateRoutes)
    .route("/client", clientRoutes)
    .route("/company", companyRoutes)
    .route("/engineer", engineerRoutes)
    .route("/invoice", invoiceRoutes)
    .route("/location", locationRoutes)
    .route("/workloads", workloadRoutes)
    .route("/unbilled", unbilledRoutes)
    .route("/vat-rate", vatRateRoutes)
    .route("/monthly-hours", monthlyHoursRoutes)
    .route("/audit-log", auditLogRoutes)
    .route("/collaborator-group", collaboratorGroupRoutes)

export type ApiRoutes = typeof app

const server = Bun.serve({
    port: PORT,
    fetch: app.fetch,
    idleTimeout: 60,
})

console.log(`🚀 API Server running at http://localhost:${PORT}`)

if (process.env.NODE_ENV !== "development") {
    // Start hourly database snapshots
    startHourlySnapshots()
}
// Graceful shutdown handling
const shutdown = () => {
    console.log("\n📭 Received shutdown signal, closing server...")
    if (process.env.NODE_ENV !== "development") {
        stopHourlySnapshots()
    }
    server.stop()
    console.log("✅ Server closed successfully")
    process.exit(0)
}

// Handle shutdown signals
process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
