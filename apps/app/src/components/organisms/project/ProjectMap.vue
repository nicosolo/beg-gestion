<template>
    <div class="md:rounded-lg md:shadow-lg overflow-hidden">
        <div ref="mapContainer" class="w-full h-full"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onActivated, watch } from "vue"
import { MarkerClusterer } from "@googlemaps/markerclusterer"
import type { ProjectMapItemResponse } from "@beg/validations"
import { useRouter } from "vue-router"
import { buildGoogleMapsUrl, buildGeoAdminUrl } from "@/utils/coordinates"
import { useGoogleMaps, SWITZERLAND_CENTER } from "@/composables/useGoogleMaps"

export interface MapBounds {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
}

interface Props {
    projects: ProjectMapItemResponse[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
    boundsChanged: [bounds: MapBounds]
}>()
const mapContainer = ref<HTMLDivElement | null>(null)
const router = useRouter()

const { createMap } = useGoogleMaps()

let map: google.maps.Map | null = null
let markerClusterer: MarkerClusterer | null = null
const markers: google.maps.marker.AdvancedMarkerElement[] = []
let boundsChangeTimeout: ReturnType<typeof setTimeout> | null = null
let isInitialLoad = true
let skipNextBoundsEmit = false
let currentInfoWindow: google.maps.InfoWindow | null = null
let openProjectId: number | null = null
const markerInfoWindows = new Map<
    number,
    { marker: google.maps.marker.AdvancedMarkerElement; infoWindow: google.maps.InfoWindow }
>()

// Emit bounds with debounce

const debouncedEmitBounds = () => {
    if (!map) return
    if (skipNextBoundsEmit) {
        skipNextBoundsEmit = false
        return
    }

    const bounds = map.getBounds()
    if (!bounds) return

    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()

    emit("boundsChanged", {
        minLat: sw.lat(),
        maxLat: ne.lat(),
        minLng: sw.lng(),
        maxLng: ne.lng(),
    })
}

const initMap = async () => {
    if (!mapContainer.value) return

    try {
        map = await createMap(mapContainer.value, {
            center: SWITZERLAND_CENTER,
            zoom: 8,
        })

        map.addListener("idle", debouncedEmitBounds)
        createMarkers()
    } catch (error) {
        console.error("Error loading Google Maps:", error)
    }
}

const createMarkers = async () => {
    if (!map) return

    // Clear existing markers
    markers.forEach((marker) => {
        marker.map = null
    })
    markers.length = 0
    markerInfoWindows.clear()

    if (markerClusterer) {
        markerClusterer.clearMarkers()
    }

    // Close current info window before recreating
    if (currentInfoWindow) {
        currentInfoWindow.close()
        currentInfoWindow = null
    }

    // Group projects by coordinates
    const positionGroups = new Map<string, typeof props.projects>()
    for (const project of props.projects) {
        const key = `${project.latitude},${project.longitude}`
        if (!positionGroups.has(key)) {
            positionGroups.set(key, [])
        }
        positionGroups.get(key)!.push(project)
    }

    // Button styles matching standard buttons
    const buttonClass =
        "rounded-md font-medium focus:outline-none focus:ring-2 cursor-pointer leading-none block text-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5"

    const getProjectLabel = (project: (typeof props.projects)[0]) =>
        project.subProjectName
            ? `${project.projectNumber} ${project.subProjectName}`
            : project.projectNumber

    for (const [, group] of positionGroups) {
        const firstProject = group[0]
        const markerContent = document.createElement("div")
        markerContent.className = "project-marker"

        if (group.length === 1) {
            const label = getProjectLabel(firstProject)
            markerContent.innerHTML = `
                <div class="marker-pin"></div>
                <div class="marker-label">${label}</div>
            `
        } else {
            markerContent.innerHTML = `
                <div class="marker-pin"></div>
                <div class="marker-label">${getProjectLabel(firstProject)} <span class="marker-count">+${group.length - 1}</span></div>
            `
        }

        const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: {
                lat: firstProject.latitude,
                lng: firstProject.longitude,
            },
            title: group.map((p) => `${getProjectLabel(p)} - ${p.name}`).join(", "),
            content: markerContent,
        })

        // Generate map URLs (same location for all in group)
        const googleMapsUrl = buildGoogleMapsUrl(firstProject.longitude, firstProject.latitude)
        const geoAdminUrl = buildGeoAdminUrl(firstProject.longitude, firstProject.latitude)

        // Build info window content with all projects in group
        const projectEntries = group
            .map((project) => {
                const label = getProjectLabel(project)
                const endedBadge = project.ended
                    ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-500 ml-1">Terminé</span>'
                    : ""
                const typeBadges = (project.types ?? [])
                    .map(
                        (t: { id: number; name: string }) =>
                            `<span class="inline-flex items-center font-semibold rounded-full px-3 py-1 text-sm bg-amber-200 text-amber-900">${t.name}</span>`
                    )
                    .join("")
                return `
                <div class="py-1">
                    <div class="flex items-center justify-between gap-3">
                        <span class="font-medium text-sm">${label}${endedBadge} - ${project.name}</span>
                        <button
                            onclick="window.dispatchEvent(new CustomEvent('navigate-to-project', { detail: ${project.id} }))"
                            class="shrink-0 rounded-md font-medium focus:outline-none cursor-pointer text-indigo-600 hover:text-indigo-800 text-sm px-1"
                        >
                            Voir
                        </button>
                    </div>${typeBadges ? `<div class="flex flex-wrap gap-1 mt-1">${typeBadges}</div>` : ""}
                </div>
            `
            })
            .join("")

        const infoWindowContent = `
            <div class="p-3 max-w-sm">
                <div class="space-y-1 mb-3 ${group.length > 1 ? "max-h-48 overflow-y-auto" : ""}">
                    ${projectEntries}
                </div>
                <div class="flex flex-col gap-2 border-t pt-2">
                    ${
                        googleMapsUrl
                            ? `<a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="${buttonClass}">
                                Ouvrir dans Google Maps
                            </a>`
                            : ""
                    }
                    ${
                        geoAdminUrl
                            ? `<a href="${geoAdminUrl}" target="_blank" rel="noopener noreferrer" class="${buttonClass}">
                                Ouvrir dans Geo Admin
                            </a>`
                            : ""
                    }
                </div>
            </div>
        `

        const infoWindow = new google.maps.InfoWindow({
            content: infoWindowContent,
        })

        infoWindow.addListener("closeclick", () => {
            currentInfoWindow = null
            openProjectId = null
        })

        marker.addListener("click", () => {
            if (currentInfoWindow) {
                currentInfoWindow.close()
            }
            currentInfoWindow = infoWindow
            openProjectId = firstProject.id
            infoWindow.open(map!, marker)
        })

        // Store for potential reopening after reload (all projects in group point to same marker)
        for (const p of group) {
            markerInfoWindows.set(p.id, { marker, infoWindow })
        }
        markers.push(marker)
    }

    // Reopen info window if one was open before reload
    if (openProjectId !== null) {
        const entry = markerInfoWindows.get(openProjectId)
        if (entry) {
            currentInfoWindow = entry.infoWindow
            entry.infoWindow.open(map!, entry.marker)
        } else {
            // Project no longer in view, clear the tracking
            openProjectId = null
        }
    }

    // Add marker clustering with consistent indigo color
    if (markers.length > 0) {
        markerClusterer = new MarkerClusterer({
            map,
            markers,
        })

        // Only fit bounds on initial load to avoid loop when updating from bounds filter
        if (isInitialLoad) {
            isInitialLoad = false
            skipNextBoundsEmit = true

            // Fit bounds to show all markers
            const bounds = new google.maps.LatLngBounds()
            props.projects.forEach((project) => {
                bounds.extend({ lat: project.latitude, lng: project.longitude })
            })
            map.fitBounds(bounds)

            // Ensure minimum zoom level
            const listener = google.maps.event.addListener(map, "idle", () => {
                if (map!.getZoom()! > 15) map!.setZoom(15)
                google.maps.event.removeListener(listener)
            })
        }
    }
}

// Listen for navigation events from info windows
const handleNavigateToProject = (event: Event) => {
    const customEvent = event as CustomEvent<number>
    router.push({ name: "project-view", params: { id: customEvent.detail } })
}

onMounted(() => {
    initMap()
    window.addEventListener("navigate-to-project", handleNavigateToProject)
})

// Handle component reactivation when using KeepAlive
onActivated(() => {
    // Re-create markers when component is reactivated from cache
    if (map && props.projects.length > 0) {
        createMarkers()
    }
})

// Re-create markers when projects change
watch(() => props.projects, createMarkers, { deep: true })

// Cleanup
onUnmounted(() => {
    window.removeEventListener("navigate-to-project", handleNavigateToProject)
    if (boundsChangeTimeout) {
        clearTimeout(boundsChangeTimeout)
    }
    if (markerClusterer) {
        markerClusterer.clearMarkers()
    }
})
</script>

<style>
/* Custom marker styles */
.project-marker {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
}

.marker-pin {
    width: 24px;
    height: 24px;
    background-color: #ef4444;
    border: 2px solid #fff;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.marker-label {
    background-color: rgba(255, 255, 255, 0.95);
    color: #1f2937;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    margin-top: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.marker-count {
    color: #4f46e5;
    font-weight: 700;
}
</style>
