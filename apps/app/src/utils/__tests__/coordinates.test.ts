import { describe, it, expect } from "vitest"
import {
    convertWgs84ToLv95,
    convertLv95ToWgs84,
    buildGeoAdminUrl,
    buildGoogleMapsUrl,
} from "../coordinates"

describe("convertWgs84ToLv95", () => {
    it("converts Bern coordinates to known LV95 values", () => {
        // Bern (Federal Palace): ~46.9481, ~7.4474
        const result = convertWgs84ToLv95(46.9481, 7.4474)
        expect(result).not.toBeNull()
        // Should be close to 2600000/1200000 (Bern reference point)
        expect(result!.easting).toBeGreaterThan(2590000)
        expect(result!.easting).toBeLessThan(2610000)
        expect(result!.northing).toBeGreaterThan(1190000)
        expect(result!.northing).toBeLessThan(1210000)
    })

    it("returns null for NaN input", () => {
        expect(convertWgs84ToLv95(NaN, 7.4474)).toBeNull()
        expect(convertWgs84ToLv95(46.9481, NaN)).toBeNull()
    })

    it("returns null for Infinity input", () => {
        expect(convertWgs84ToLv95(Infinity, 7.4474)).toBeNull()
        expect(convertWgs84ToLv95(46.9481, -Infinity)).toBeNull()
    })
})

describe("convertLv95ToWgs84", () => {
    it("converts LV95 Bern reference back to ~46.95, ~7.44", () => {
        const result = convertLv95ToWgs84(2600000, 1200000)
        expect(result.latitude).toBeCloseTo(46.95, 1)
        expect(result.longitude).toBeCloseTo(7.44, 1)
    })

    it("round-trip WGS84 → LV95 → WGS84 within tolerance", () => {
        const lat = 46.9481
        const lng = 7.4474
        const lv95 = convertWgs84ToLv95(lat, lng)!
        const wgs84 = convertLv95ToWgs84(lv95.easting, lv95.northing)
        // Round-trip accuracy within ~0.01 degree
        expect(wgs84.latitude).toBeCloseTo(lat, 2)
        expect(wgs84.longitude).toBeCloseTo(lng, 2)
    })
})

describe("buildGeoAdminUrl", () => {
    it("returns valid URL with correct params", () => {
        const url = buildGeoAdminUrl(7.4474, 46.9481)
        expect(url).not.toBeNull()
        expect(url).toContain("https://map.geo.admin.ch/")
        expect(url).toContain("zoom=11")
        expect(url).toContain("lang=fr")
        expect(url).toContain("topic=ech")
        expect(url).toContain("bgLayer=ch.swisstopo.pixelkarte-farbe")
        // Should contain E and N params with numeric values
        const parsed = new URL(url!)
        expect(parsed.searchParams.get("E")).toBeTruthy()
        expect(parsed.searchParams.get("N")).toBeTruthy()
    })

    it("returns null for null coordinates", () => {
        expect(buildGeoAdminUrl(null, 46.9481)).toBeNull()
        expect(buildGeoAdminUrl(7.4474, null)).toBeNull()
        expect(buildGeoAdminUrl(null, null)).toBeNull()
    })

    it("accepts custom zoom number", () => {
        const url = buildGeoAdminUrl(7.4474, 46.9481, 15)
        expect(url).toContain("zoom=15")
    })

    it("accepts options object with zoom and embed", () => {
        const url = buildGeoAdminUrl(7.4474, 46.9481, { zoom: 8, embed: true })
        expect(url).toContain("zoom=8")
        expect(url).toContain("embed.html")
    })
})

describe("buildGoogleMapsUrl", () => {
    it("returns valid Google Maps URL", () => {
        const url = buildGoogleMapsUrl(7.4474, 46.9481)
        expect(url).not.toBeNull()
        expect(url).toContain("https://www.google.com/maps/search/")
        expect(url).toContain("api=1")
        expect(url).toContain("46.94810000")
        expect(url).toContain("7.44740000")
    })

    it("returns null for null coordinates", () => {
        expect(buildGoogleMapsUrl(null, 46.9481)).toBeNull()
        expect(buildGoogleMapsUrl(7.4474, null)).toBeNull()
        expect(buildGoogleMapsUrl(null, null)).toBeNull()
    })
})
