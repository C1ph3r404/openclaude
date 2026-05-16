/**
 * New chat command - creates a new chat in BrowserLLM.
 * Implementation is lazy-loaded from new.ts to reduce startup time.
 */
import type { Command } from '../../commands.js'

const newCommand = {
    type: 'local',
    name: 'new',
    description: 'Create a new chat and clear conversation history',
    supportsNonInteractive: false,
    load: () => import('./new.js'),
} satisfies Command

export default newCommand
