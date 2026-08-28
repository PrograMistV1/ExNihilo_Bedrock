import {Block, Player, RawMessage, system, world} from "@minecraft/server";

export type ProgressMessage = RawMessage | string | (RawMessage | string)[];
export type ProgressChecker = (block: Block) => ProgressMessage;

export const progressCheckers = new Map<string, ProgressChecker>();

export function addProgressChecker(component: string, callback: ProgressChecker): void {
    progressCheckers.set(component, callback);
}

/**
 * Declarative progress rule: if condition(block) === true,
 * format(block) is applied to obtain the message.
 * Rules are evaluated in order; the first match wins.
 */
export interface ProgressRule<TContext> {
    condition: (ctx: TContext, block: Block) => boolean;
    format: (ctx: TContext, block: Block) => ProgressMessage;
}

/**
 * Builds a ProgressChecker from a list of rules + a context-getting function.
 * The last rule in the list should be "catch everything" (condition: () => true) -
 * This is the default fallback format.
 */
export function createProgressChecker<TContext>(
    getContext: (block: Block) => TContext,
    rules: ProgressRule<TContext>[]
): ProgressChecker {
    return (block: Block) => {
        const ctx = getContext(block);
        const rule = rules.find(r => r.condition(ctx, block));
        if (!rule) {
            throw new Error("createProgressChecker: no matching rule and no fallback rule provided");
        }
        return rule.format(ctx, block);
    };
}

export function percentOfTimer(timer: number, totalUpdates: number): string {
    return Math.floor(timer / totalUpdates * 100) + "%";
}

export function fractionOf100(filling: number): string {
    return parseFloat(filling.toFixed(1)).toString() + "/100";
}

export const DONE_MESSAGE: RawMessage = {translate: "gui.done"};

const SHOW_PROGRESS_PROPERTY = "exnihilo_show_progress";
const ACTION_BAR_HIDE = "exnihilo:hide";

const progressVisibilityCache = new Map<string, boolean>();
const wasActionBarShown = new Map<string, boolean>();

export function setProgressVisibility(player: Player, show: boolean): void {
    player.setDynamicProperty(SHOW_PROGRESS_PROPERTY, show);
    progressVisibilityCache.set(player.id, show);
}

function getProgressVisibility(player: Player): boolean {
    const cached = progressVisibilityCache.get(player.id);
    if (cached !== undefined) return cached;

    const stored = player.getDynamicProperty(SHOW_PROGRESS_PROPERTY) as boolean | undefined ?? true;
    progressVisibilityCache.set(player.id, stored);
    return stored;
}

function getProgressMessage(block: Block): ProgressMessage | null {
    for (const [component, checker] of progressCheckers) {
        if (block.hasComponent(component)) {
            return checker(block);
        }
    }
    return null;
}

function tickPlayer(player: Player): void {
    const playerId = player.id;

    if (!getProgressVisibility(player)) {
        if (wasActionBarShown.get(playerId)) {
            player.onScreenDisplay.setActionBar(ACTION_BAR_HIDE);
            wasActionBarShown.set(playerId, false);
        }
        return;
    }

    const block = player.getBlockFromViewDirection({maxDistance: 6})?.block;
    const message = block ? getProgressMessage(block) : null;

    if (message !== null) {
        player.onScreenDisplay.setActionBar(message);
        wasActionBarShown.set(playerId, true);
    } else if (wasActionBarShown.get(playerId)) {
        player.onScreenDisplay.setActionBar(ACTION_BAR_HIDE);
        wasActionBarShown.set(playerId, false);
    }
}

system.runInterval(() => {
    world.getPlayers().forEach(tickPlayer);
});