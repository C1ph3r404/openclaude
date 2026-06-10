/**
 * New chat command implementation.
 * Creates a new chat in BrowserLLM (if available) and starts a fresh local session.
 * The old chat is preserved in ChatGPT history.
 */
import type { LocalCommandCall } from '../../types/command.js'
import {
    isBrowserLLMProvider,
    newChatSession,
} from '../../services/api/browserLLMProvider.js'
import { logError } from '../../utils/log.js'
import { clearConversation } from '../clear/conversation.js'

export const call: LocalCommandCall = async (_, context) => {
    // If using BrowserLLM, create a new chat without deleting the old one
    if (isBrowserLLMProvider()) {
        try {
            const result = await newChatSession()

            if (!result.success) {
                logError(`Failed to create new chat in BrowserLLM: ${result.error}`)
                return { type: 'text', value: `` }
            }

            // Clear local conversation after successful BrowserLLM new chat creation
            // Pass skipBrowserLLMDelete=true since we already created a new chat above
            await clearConversation({
                ...context,
                skipBrowserLLMDelete: true,
            })

            return {
                type: 'text',
                value: ``,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logError(`Error creating new chat: ${errorMessage}`)
            return { type: 'text', value: `` }
        }
    }

    // Fallback: just clear local conversation if not using BrowserLLM
    await clearConversation(context)
    return { type: 'text', value: '' }
}
