import {Block, RawMessage} from "@minecraft/server";

export type ProgressChecker = (block: Block) => (RawMessage | string)[] | RawMessage | string;

export const progressCheckers = new Map<string, ProgressChecker>();

export function addProgressChecker(component: string, callback: ProgressChecker): void {
    progressCheckers.set(component, callback);
}