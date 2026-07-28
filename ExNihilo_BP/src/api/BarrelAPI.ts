import {Dimension, system, Vector3, world} from "@minecraft/server";
import {BarrelComponent} from "../components/blocks/BarrelComponent";
import {BlockInput} from "../components/blocks/tiles/FilledTileEntityBlock";

/**
 * BarrelAPI - a scriptevent-based external API for controlling ExNihilo barrels.
 *
 * Since this addon's script modules aren't importable by other behavior packs,
 * this exposes barrel control through `/scriptevent` messages instead. Any other
 * pack, command block, or function file can drive barrels this way - no shared
 * script module required.
 *
 * All events are namespaced under "exnihilo" and must be triggered with
 * `system.afterEvents.scriptEventReceive` payloads of the form:
 *
 *   scriptevent exnihilo:barrel_set {"dimension":"minecraft:overworld","x":0,"y":64,"z":0,"input":"exnihilo:water","filling":100}
 *   scriptevent exnihilo:barrel_empty {"dimension":"minecraft:overworld","x":0,"y":64,"z":0}
 *   scriptevent exnihilo:barrel_get {"dimension":"minecraft:overworld","x":0,"y":64,"z":0,"responseId":"my_request_1"}
 *
 * ---- exnihilo:barrel_set ----
 * Sets a barrel's input/filling at the given position to an absolute value (e.g. "make this
 * barrel exactly 60% full of water"), overwriting whatever was there before.
 * Payload:
 * {
 *   dimension: string;   // e.g. "minecraft:overworld"
 *   x, y, z: number;     // block coordinates of the barrel
 *   input: string;       // one of the BlockInput values, e.g. "exnihilo:water", "exnihilo:lava",
 *                         // "exnihilo:dirt", "exnihilo:compost", "exnihilo:clay", "exnihilo:netherrack",
 *                         // "exnihilo:end_stone", "exnihilo:witch_water", "exnihilo:soul_sand", "exnihilo:slime"
 *   filling?: number;    // 0-100, defaults to 100, capped to that range. Ignored if input is "exnihilo:default"
 *                         // (use barrel_empty for that instead).
 * }
 *
 * ---- exnihilo:barrel_empty ----
 * Empties a barrel at the given position (equivalent to setting it back to "exnihilo:default"),
 * with the same delayed-drain animation as emptying a barrel with a bucket in-world.
 * Payload:
 * {
 *   dimension: string;
 *   x, y, z: number;
 * }
 *
 * ---- exnihilo:barrel_get ----
 * Queries a barrel's current state. Since scriptevent calls can't return a value directly to
 * whatever triggered them, the result is broadcast back out as another scriptevent
 * (`exnihilo:barrel_state`) that other scripts can listen for, matched up by `responseId`.
 * Payload:
 * {
 *   dimension: string;
 *   x, y, z: number;
 *   responseId?: string; // opaque token echoed back in the response so callers can match requests
 * }
 *
 * Response (fired as `system.afterEvents.scriptEventReceive` with id "exnihilo:barrel_state"):
 * {
 *   dimension, x, y, z,
 *   responseId,
 *   input: string,     // current BlockInput, "exnihilo:default" if empty or not a barrel
 *   filling: number,   // 0-100
 *   isBarrel: boolean  // false if the block at that position isn't an ExNihilo barrel
 * }
 */

const VALID_INPUTS: ReadonlySet<string> = new Set<BlockInput>([
    "exnihilo:default",
    "exnihilo:compost",
    "exnihilo:dirt",
    "exnihilo:gravel",
    "exnihilo:clay",
    "exnihilo:netherrack",
    "exnihilo:end_stone",
    "exnihilo:water",
    "exnihilo:lava",
    "exnihilo:witch_water",
    "exnihilo:soul_sand",
    "exnihilo:slime",
]);

type BarrelSetPayload = {
    dimension: string;
    x: number;
    y: number;
    z: number;
    input: string;
    filling?: number;
};

type BarrelEmptyPayload = {
    dimension: string;
    x: number;
    y: number;
    z: number;
};

type BarrelGetPayload = {
    dimension: string;
    x: number;
    y: number;
    z: number;
    responseId?: string;
};

let barrelComponent: BarrelComponent;

/**
 * Registers the scriptevent listeners for the barrel API.
 * Must be called with the *same* BarrelComponent instance that was registered
 * via `blockComponentRegistry.registerCustomComponent`, so reads/writes go
 * through one consistent component (avoids double-registering progress checkers
 * or diverging behavior between the "real" component and the API).
 */
export function registerBarrelAPI(component: BarrelComponent): void {
    barrelComponent = component;

    system.afterEvents.scriptEventReceive.subscribe((event) => {
        switch (event.id) {
            case "exnihilo:barrel_set":
                handleSet(event.message);
                break;
            case "exnihilo:barrel_empty":
                handleEmpty(event.message);
                break;
            case "exnihilo:barrel_get":
                handleGet(event.message);
                break;
        }
    }, {namespaces: ["exnihilo"]});
}

function parse<T>(raw: string, requiredKeys: (keyof T)[]): T | null {
    let parsed: T;
    try {
        parsed = JSON.parse(raw);
    } catch {
        console.warn(`[exnihilo:BarrelAPI] Invalid JSON payload: ${raw}`);
        return null;
    }

    for (const key of requiredKeys) {
        if (parsed[key] === undefined) {
            console.warn(`[exnihilo:BarrelAPI] Missing required field "${String(key)}" in payload: ${raw}`);
            return null;
        }
    }
    return parsed;
}

function getDimension(id: string): Dimension | null {
    try {
        return world.getDimension(id);
    } catch {
        console.warn(`[exnihilo:BarrelAPI] Unknown dimension: ${id}`);
        return null;
    }
}

function handleSet(raw: string): void {
    const payload = parse<BarrelSetPayload>(raw, ["dimension", "x", "y", "z", "input"]);
    if (!payload) return;

    if (!VALID_INPUTS.has(payload.input)) {
        console.warn(`[exnihilo:BarrelAPI] Invalid input type "${payload.input}". Valid values: ${[...VALID_INPUTS].join(", ")}`);
        return;
    }

    const dimension = getDimension(payload.dimension);
    if (!dimension) return;

    const pos: Vector3 = {x: payload.x, y: payload.y, z: payload.z};
    const block = dimension.getBlock(pos);
    if (!block?.hasComponent("exnihilo:barrel")) {
        console.warn(`[exnihilo:BarrelAPI] Block at ${payload.x}, ${payload.y}, ${payload.z} in ${payload.dimension} is not an ExNihilo barrel.`);
        return;
    }

    barrelComponent.setState(block, payload.input as BlockInput, payload.filling ?? 100);
}

function handleEmpty(raw: string): void {
    const payload = parse<BarrelEmptyPayload>(raw, ["dimension", "x", "y", "z"]);
    if (!payload) return;

    const dimension = getDimension(payload.dimension);
    if (!dimension) return;

    const pos: Vector3 = {x: payload.x, y: payload.y, z: payload.z};
    const block = dimension.getBlock(pos);
    if (!block?.hasComponent("exnihilo:barrel")) {
        console.warn(`[exnihilo:BarrelAPI] Block at ${payload.x}, ${payload.y}, ${payload.z} in ${payload.dimension} is not an ExNihilo barrel.`);
        return;
    }

    barrelComponent.empty(block);
}

function handleGet(raw: string): void {
    const payload = parse<BarrelGetPayload>(raw, ["dimension", "x", "y", "z"]);
    if (!payload) return;

    const dimension = getDimension(payload.dimension);
    if (!dimension) return;

    const pos: Vector3 = {x: payload.x, y: payload.y, z: payload.z};
    const block = dimension.getBlock(pos);
    const isBarrel = block?.hasComponent("exnihilo:barrel") ?? false;

    const state = isBarrel ? barrelComponent.getState(block) : {input: "exnihilo:default", filling: 0};

    const response = {
        dimension: payload.dimension,
        x: payload.x,
        y: payload.y,
        z: payload.z,
        responseId: payload.responseId,
        input: state.input,
        filling: state.filling,
        isBarrel
    };

    // scriptevent can't return a value to the caller synchronously, so we broadcast the
    // result back out as another scriptevent that other scripts (in this or other packs)
    // can subscribe to and match up via responseId.
    system.run(() => {
        try {
            dimension.runCommand(`scriptevent exnihilo:barrel_state ${JSON.stringify(response)}`);
        } catch (e) {
            console.warn(`[exnihilo:BarrelAPI] Failed to broadcast barrel_state response: ${e}`);
        }
    });
}