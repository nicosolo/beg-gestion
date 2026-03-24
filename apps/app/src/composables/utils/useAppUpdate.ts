import { ref, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"

const POLL_INTERVAL = 60_000

const updateAvailable = ref(false)
let currentCommit: string | null = null
let timer: ReturnType<typeof setInterval> | null = null
let started = false

async function check() {
    if (updateAvailable.value) return
    try {
        const res = await fetch(`/version.json?t=${Date.now()}`)
        if (!res.ok) return
        const { commit } = await res.json()
        if (!currentCommit) {
            currentCommit = commit
            return
        }
        if (commit !== currentCommit) {
            updateAvailable.value = true
            if (timer) clearInterval(timer)
        }
    } catch {
        // network error, ignore
    }
}

export function useAppUpdate() {
    const router = useRouter()

    router.afterEach(() => {
        check()
    })

    function onVisibilityChange() {
        if (document.visibilityState === "visible") check()
    }

    onMounted(() => {
        if (!started) {
            started = true
            check()
            timer = setInterval(check, POLL_INTERVAL)
        }
        document.addEventListener("visibilitychange", onVisibilityChange)
    })

    onUnmounted(() => {
        if (timer) clearInterval(timer)
        started = false
        document.removeEventListener("visibilitychange", onVisibilityChange)
    })

    function reload() {
        window.location.reload()
    }

    return { updateAvailable, reload }
}
