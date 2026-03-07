<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useAuthStore } from "../stores/auth"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const email = ref("")
const password = ref("")
const errorMessage = ref("")
const isLoading = ref(false)

const authStore = useAuthStore()
const router = useRouter()

async function handleLogin() {
    if (!email.value || !password.value) {
        errorMessage.value = t("auth.bothFieldsRequired")
        return
    }

    isLoading.value = true
    errorMessage.value = ""

    try {
        const success = await authStore.login(email.value, password.value)
        if (success) {
            router.push("/")
        } else {
            errorMessage.value = t("auth.invalidCredentials")
        }
    } catch (error) {
        if (error instanceof Error) {
            errorMessage.value = error.message
        } else {
            errorMessage.value = t("auth.loginError")
        }
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    document.title = "BEG - Connexion"
})
</script>

<template>
    <div class="login-container">
        <div class="login-form">
            <div class="flex justify-center mb-6">
                <img alt="BEG logo" class="h-12 w-auto" src="@/assets/logo.png" />
            </div>

            <h1 class="text-2xl font-bold text-center mb-6">{{ t("auth.welcome") }}</h1>

            <div v-if="errorMessage" class="error-message">
                {{ errorMessage }}
            </div>

            <form @submit.prevent="handleLogin">
                <div class="form-group">
                    <label for="email">{{ t("auth.email") }}</label>
                    <input
                        id="email"
                        v-model="email"
                        :placeholder="t('auth.enterEmailOrInitials')"
                        required
                        class="focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                </div>

                <div class="form-group">
                    <label for="password">{{ t("auth.password") }}</label>
                    <input
                        id="password"
                        type="password"
                        v-model="password"
                        :placeholder="t('auth.enterPassword')"
                        required
                        class="focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                </div>

                <button type="submit" :disabled="isLoading" class="login-button">
                    {{ isLoading ? t("auth.loggingIn") : t("auth.signIn") }}
                </button>
            </form>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f9fafb;
}

.login-form {
    width: 100%;
    max-width: 400px;
    padding: 2.5rem;
    border-radius: 0.75rem;
    box-shadow:
        0 4px 6px rgba(0, 0, 0, 0.05),
        0 10px 15px rgba(0, 0, 0, 0.1);
    background-color: white;
}

.form-group {
    margin-bottom: 1.5rem;
}

label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
}

input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
    outline: none;
    transition: all 0.2s;
}

.login-button {
    width: 100%;
    padding: 0.75rem;
    background-color: #4f46e5;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.login-button:hover {
    background-color: #4338ca;
}

.login-button:disabled {
    background-color: #a5a5a5;
    cursor: not-allowed;
}

.error-message {
    padding: 0.75rem;
    margin-bottom: 1.5rem;
    background-color: #fee2e2;
    color: #b91c1c;
    border-radius: 0.375rem;
    font-size: 0.875rem;
}
</style>
