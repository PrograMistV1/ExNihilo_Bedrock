import {Block, Player, RawMessage, system, world} from "@minecraft/server";

export type ProgressChecker = (block: Block) => RawMessage | string | (RawMessage | string)[];

export const progressCheckers = new Map<string, ProgressChecker>();

export function addProgressChecker(component: string, callback: ProgressChecker): void {
    progressCheckers.set(component, callback);
}

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

function getProgressMessage(block: Block): (RawMessage | string | (RawMessage | string)[]) | null {
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