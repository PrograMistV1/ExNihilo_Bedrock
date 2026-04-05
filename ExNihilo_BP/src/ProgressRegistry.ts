import {Block, RawMessage, system, world} from "@minecraft/server";

export type ProgressChecker = (block: Block) => (RawMessage | string)[] | RawMessage | string;

export const progressCheckers = new Map<string, ProgressChecker>();
const lastActionBarShown = new Map<string, boolean>();

export function addProgressChecker(component: string, callback: ProgressChecker): void {
    progressCheckers.set(component, callback);
}

system.runInterval(() => {
    world.getPlayers().forEach(player => {
        const playerId = player.id;
        const block = player.getBlockFromViewDirection({maxDistance: 6})?.block;

        let callbackShown = false;
        if (block) {
            for (const [component, callback] of progressCheckers) {
                if (!block.hasComponent(component)) continue;

                player.onScreenDisplay.setActionBar(callback(block));
                callbackShown = true;
                break;
            }
        }

        const lastShown = lastActionBarShown.get(playerId) ?? false;
        if (!callbackShown && lastShown) {
            player.onScreenDisplay.setActionBar("exnihilo:hide");
        }
        lastActionBarShown.set(playerId, callbackShown);
    });
});