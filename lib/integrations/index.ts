/**
 * Single import point that registers every available adapter. Import this
 * module from route handlers before calling `resolveProvider` so the
 * registry is populated.
 */

import './adapters/localProvider';
import './adapters/fedenaProvider';

export * from './schoolDataProvider';
