import {Dimension, system, Vector3, world} from "@minecraft/server";
import {CrucibleComponent} from "../components/blocks/CrucibleComponent";
import {BlockInput} from "../components/blocks/tiles/FilledTileEntityBlock";

/**
 * CrucibleAPI - a scriptevent-based external API for controlling ExNihilo crucibles.
 *
 * Since this addon's script modules aren't importable by other behavior packs,
 * this exposes crucible control through `/scriptevent` messages instead. Any other
 * pack, command block, or function file can drive crucibles this way - no shared
 * script module required.
 *
 * All events are namespaced under "exnihilo" and must be triggered with
 * `system.afterEvents.scriptEventReceive` payloads of the form:
 *
 *   scriptevent exnihilo:crucible_set {"dimension":"minecraft:overworld","x":0,"y":64,"z":0,"input":"exnihilo:lava","filling":100}
 *   scriptevent exnihilo:crucible_empty {"dimension":"minecraft:overworld","x":0,"y":64,"z":0}
 *   scriptevent exnihilo:crucible_get {"dimension":"minecraft:overworld","x":0,"y":64,"z":0,"responseId":"my_request_1"}
 *
 * ---- exnihilo:crucible_set ----
 * Sets a crucible's input/filling at the given position to an absolute value (e.g. "make this
 * crucible exactly full of lava"), overwriting whatever was there before.
 * Payload:
 * {
 *   dimension: string;   // e.g. "minecraft:overworld"
 *   x, y, z: number;     // block coordinates of the crucible
 *   input: string;       // one of the BlockInput values a crucible actually uses:
 *                         // "exnihilo:gravel" (melting stone/gravel, pre-lava),
 *                         // "exnihilo:compost" (melting leaves/saplings, pre-water),
 *                         // "exnihilo:lava" (finished, extractable with a bucket),
 *                         // "exnihilo:water" (finished, extractable with a bucket)
 *   filling?: number;    // 0-100, defaults to 100, capped to that range. Ignored if input is "exnihilo:default"
 *                         // (use crucible_empty for that instead).
 * }
 *
 * ---- exnihilo:crucible_empty ----
 * Empties a crucible at the given position (equivalent to setting it back to "exnihilo:default"),
 * with the same delayed-drain animation as extracting lava/water with a bucket in-world.
 * Payload:
 * {
 *   dimension: string;
 *   x, y, z: number;
 * }
 *
 * ---- exnihilo:crucible_get ----
 * Queries a crucible's current state. Since scriptevent calls can't return a value directly to
 * whatever triggered them, the result is broadcast back out as another scriptevent
 * (`exnihilo:crucible_state`) that other scripts can listen for, matched up by `responseId`.
 * Payload:
 * {
 *   dimension: string;
 *   x, y, z: number;
 *   responseId?: string; // opaque token echoed back in the response so callers can match requests
 * }
 *
 * Response (fired as `system.afterEvents.scriptEventReceive` with id "exnihilo:crucible_state"):
 * {
 *   dimension, x, y, z,
 *   responseId,
 *   input: string,     // current BlockInput, "exnihilo:default" if empty or not a crucible
 *   filling: number,   // 0-100
 *   isCrucible: boolean  // false if the block at that position isn't an ExNihilo crucible
 * }
 */

const VALID_INPUTS: ReadonlySet<string> = new Set<BlockInput>([
    "exnihilo:default",
    "exnihilo:gravel",
    "exnihilo:compost",
    "exnihilo:lava",
    "exnihilo:water",
]);

type CrucibleSetPayload = {
    dimension: string;
    x: number;
    y: number;
    z: number;
    input: string;
    filling?: number;
};

type CrucibleEmptyPayload = {
    dimension: string;
    x: number;
    y: number;
    z: number;
};

type CrucibleGetPayload = {
    dimension: string;
    x: number;
    y: number;
    z: number;
    responseId?: string;
};

let crucibleComponent: CrucibleComponent;

/**
 * Registers the scriptevent listeners for the crucible API.
 * Must be called with the *same* CrucibleComponent instance that was registered
 * via `blockComponentRegistry.registerCustomComponent`, so reads/writes go
 * through one consistent component (avoids double-registering progress checkers
 * or diverging behavior between the "real" component and the API).
 */
export function registerCrucibleAPI(component: CrucibleComponent): void {
    crucibleComponent = component;

    system.afterEvents.scriptEventReceive.subscribe((event) => {
        switch (event.id) {
            case "exnihilo:crucible_set":
                handleSet(event.message);
                break;
            case "exnihilo:crucible_empty":
                handleEmpty(event.message);
                break;
            case "exnihilo:crucible_get":
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
        console.warn(`[exnihilo:CrucibleAPI] Invalid JSON payload: ${raw}`);
        return null;
    }

    for (const key of requiredKeys) {
        if (parsed[key] === undefined) {
            console.warn(`[exnihilo:CrucibleAPI] Missing required field "${String(key)}" in payload: ${raw}`);
            return null;
        }
    }
    return parsed;
}

function getDimension(id: string): Dimension | null {
    try {
        return world.getDimension(id);
    } catch {
        console.warn(`[exnihilo:CrucibleAPI] Unknown dimension: ${id}`);
        return null;
    }
}

function handleSet(raw: string): void {
    const payload = parse<CrucibleSetPayload>(raw, ["dimension", "x", "y", "z", "input"]);
    if (!payload) return;

    if (!VALID_INPUTS.has(payload.input)) {
        console.warn(`[exnihilo:CrucibleAPI] Invalid input type "${payload.input}". Valid values: ${[...VALID_INPUTS].join(", ")}`);
        return;
    }

    const dimension = getDimension(payload.dimension);
    if (!dimension) return;

    const pos: Vector3 = {x: payload.x, y: payload.y, z: payload.z};
    const block = dimension.getBlock(pos);
    if (!block?.hasComponent("exnihilo:crucible")) {
        console.warn(`[exnihilo:CrucibleAPI] Block at ${payload.x}, ${payload.y}, ${payload.z} in ${payload.dimension} is not an ExNihilo crucible.`);
        return;
    }

    crucibleComponent.setState(block, payload.input as BlockInput, payload.filling ?? 100);
}

function handleEmpty(raw: string): void {
    const payload = parse<CrucibleEmptyPayload>(raw, ["dimension", "x", "y", "z"]);
    if (!payload) return;

    const dimension = getDimension(payload.dimension);
    if (!dimension) return;

    const pos: Vector3 = {x: payload.x, y: payload.y, z: payload.z};
    const block = dimension.getBlock(pos);
    if (!block?.hasComponent("exnihilo:crucible")) {
        console.warn(`[exnihilo:CrucibleAPI] Block at ${payload.x}, ${payload.y}, ${payload.z} in ${payload.dimension} is not an ExNihilo crucible.`);
        return;
    }

    crucibleComponent.empty(block);
}

function handleGet(raw: string): void {
    const payload = parse<CrucibleGetPayload>(raw, ["dimension", "x", "y", "z"]);
    if (!payload) return;

    const dimension = getDimension(payload.dimension);
    if (!dimension) return;

    const pos: Vector3 = {x: payload.x, y: payload.y, z: payload.z};
    const block = dimension.getBlock(pos);
    if (!block) return;
    const isCrucible = block?.hasComponent("exnihilo:crucible") ?? false;

    const state = isCrucible ? crucibleComponent.getState(block) : {input: "exnihilo:default", filling: 0};

    const response = {
        dimension: payload.dimension,
        x: payload.x,
        y: payload.y,
        z: payload.z,
        responseId: payload.responseId,
        input: state.input,
        filling: state.filling,
        isCrucible
    };

    // scriptevent can't return a value to the caller synchronously, so we broadcast the
    // result back out as another scriptevent that other scripts (in this or other packs)
    // can subscribe to and match up via responseId.
    system.run(() => {
        try {
            dimension.runCommand(`scriptevent exnihilo:crucible_state ${JSON.stringify(response)}`);
        } catch (e) {
            console.warn(`[exnihilo:CrucibleAPI] Failed to broadcast crucible_state response: ${e}`);
        }
    });
}