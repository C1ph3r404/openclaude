/**
 * BrowserLLM Provider — Integration with BrowserLLM API
 * Handles communication with BrowserLLM server for chat management
 */

interface BrowserLLMConfig {
    baseUrl: string;
}

let config: BrowserLLMConfig | null = null;

/**
 * Initialize BrowserLLM provider with configuration
 */
export function initBrowserLLMProvider(baseUrl: string): void {
    config = { baseUrl };
}

/**
 * Get current configuration
 */
export function getBrowserLLMConfig(): BrowserLLMConfig | null {
    return config;
}

/**
 * Get the current chat ID from BrowserLLM
 */
export async function getCurrentChatId(): Promise<string | null> {
    if (!config) return null;

    try {
        const response = await fetch(`${config.baseUrl}/current-chat-id`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.chatId || null;
    } catch (error) {
        console.error('Error getting current chat ID from BrowserLLM:', error);
        return null;
    }
}

/**
 * Delete the current chat and start a new one
 */
export async function deleteChat(): Promise<{ success: boolean; error?: string }> {
    if (!config) {
        return { success: false, error: 'BrowserLLM provider not initialized' };
    }

    try {
        const response = await fetch(`${config.baseUrl}/delete-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.message || `HTTP ${response.status}`,
            };
        }

        const data = await response.json();

        return {
            success: data.success ?? true,
            error: data.message,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: `Failed to delete chat: ${errorMessage}` };
    }
}

/**
 * Set the chat ID to resume a specific ChatGPT conversation
 */
export async function setChatId(chatId: string): Promise<{ success: boolean; error?: string }> {
    if (!config) {
        return { success: false, error: 'BrowserLLM provider not initialized' };
    }

    try {
        // Create an AbortController with 30 second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(`${config.baseUrl}/set-chat-id`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ chatId }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: errorData.message || `HTTP ${response.status}`,
                };
            }

            const data = await response.json();

            return {
                success: data.success ?? true,
                error: data.message,
            };
        } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: `Failed to set chat ID: ${errorMessage}` };
    }
}

/**
 * Check if we're using BrowserLLM provider
 */
export function isBrowserLLMProvider(): boolean {
    return config !== null;
}

/**
 * Detect if base URL is BrowserLLM
 */
export function isBrowserLLMUrl(baseUrl: string | undefined): boolean {
    if (!baseUrl) return false;
    return /localhost:3579|127\.0\.0\.1:3579|browserllm/.test(baseUrl);
}
