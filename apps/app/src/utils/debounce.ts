/**
 * Creates a debounced version of a function that delays invoking the function
 * until after `delay` milliseconds have elapsed since the last time it was invoked.
 *
 * @param fn The function to debounce
 * @param delay The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null

    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout)
        }

        timeout = setTimeout(() => {
            fn(...args)
            timeout = null
        }, delay)
    }
}

/**
 * Creates a debounced version of an async function that delays invoking the function
 * until after `delay` milliseconds have elapsed since the last time it was invoked.
 *
 * @param fn The async function to debounce
 * @param delay The number of milliseconds to delay
 * @returns A debounced version of the async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => Promise<void> {
    let timeout: ReturnType<typeof setTimeout> | null = null

    return (...args: Parameters<T>) => {
        return new Promise<void>((resolve) => {
            if (timeout) {
                clearTimeout(timeout)
            }

            timeout = setTimeout(async () => {
                await fn(...args)
                timeout = null
                resolve()
            }, delay)
        })
    }
}
