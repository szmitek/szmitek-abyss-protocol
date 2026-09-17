import type { AIProvider } from '../domain/aiContracts.ts';
import { MockAIProvider } from '../domain/mockAIProvider.ts';

// The only provider composition point. No SDK, credentials or transport.
export const reviewProvider: AIProvider = new MockAIProvider();
