import { mount, type ComponentMountingOptions } from "@vue/test-utils"
import { createPinia } from "pinia"
import { createI18n } from "vue-i18n"
import type { Component } from "vue"
import fr from "@/i18n/locales/fr"

export function mountWithPlugins<T extends Component>(
    component: T,
    options: ComponentMountingOptions<T> = {},
) {
    const i18n = createI18n({
        legacy: false,
        locale: "fr",
        messages: { fr },
    })

    const pinia = createPinia()

    return mount(component, {
        ...options,
        global: {
            ...options.global,
            plugins: [i18n, pinia, ...(options.global?.plugins ?? [])],
        },
    })
}
