/**
 * Types partages entre le contenu et le stockage.
 * Isoles ici pour que src/db n'importe pas zod.
 */
export type { Level, Variant } from './schema';
export type { Tolerance } from '@/engine/grading/normalize';
