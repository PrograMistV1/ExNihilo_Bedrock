import {Dimension, Vector3, world} from "@minecraft/server";
import {core} from '@bedrock-core/server-runtime';
import {BarrelComponent} from "../components/blocks/BarrelComponent";
import {BlockInput} from "../components/blocks/tiles/FilledTileEntityBlock";

/**
 * BarrelAPI - a bedrock-core RPC-based external API for controlling ExNihilo barrels.
 *
 * Exposed under the "exnihilo" node id (see core.register in main.ts), reachable from any
 * other bedrock-core addon via:
 *
 *   const exnihilo = core.rpc.typed<BarrelRPC>('exnihilo');
 *   await exnihilo.barrelSet({ dimension: 'minecraft:overworld', x: 0, y: 64, z: 0, input: 'exnihilo:water', filling: 60 });
 *   await exnihilo.barrelEmpty({ dimension: 'minecraft:overworld', x: 0, y: 64, z: 0 });
 *   const state = await exnihilo.barrelGet({ dimension: 'minecraft:overworld', x: 0, y: 64, z: 0 });
 *
 * Method names are namespaced with "barrel" since this node also serves crucible/sieve RPCs.
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

export type BarrelPosition = {
    dimension: string;
    x: number;
    y: number;
    z: number;
};

export type BarrelSetParams = BarrelPosition & {
    input: string;
    filling?: number;
};

export type BarrelState = {
    input: string;
    filling: number;
    isBarrel: boolean;
};

export interface BarrelRPC {
    barrelSet(params: BarrelSetParams): void;

    barrelEmpty(params: BarrelPosition): void;

    barrelGet(params: BarrelPosition): BarrelState;
}

function getDimension(id: string): Dimension {
    try {
        return world.getDimension(id);
    } catch {
        throw new Error(`Unknown dimension: ${id}`);
    }
}

/**
 * Registers the RPC handlers for the barrel API.
 * Must be called with the *same* BarrelComponent instance that was registered
 * via `blockComponentRegistry.registerCustomComponent`, so reads/writes go
 * through one consistent component.
 */
export function registerBarrelAPI(component: BarrelComponent): void {
    core.rpc.serve<BarrelRPC>({
        barrelSet: (params) => {
            if (!VALID_INPUTS.has(params.input)) {
                throw new Error(`Invalid input type "${params.input}". Valid values: ${[...VALID_INPUTS].join(", ")}`);
            }

            const dimension = getDimension(params.dimension);
            const pos: Vector3 = {x: params.x, y: params.y, z: params.z};
            const block = dimension.getBlock(pos);
            if (!block?.hasComponent("exnihilo:barrel")) {
                throw new Error(`Block at ${params.x}, ${params.y}, ${params.z} in ${params.dimension} is not an ExNihilo barrel.`);
            }

            component.setState(block, params.input as BlockInput, params.filling ?? 100);
        },

        barrelEmpty: (params) => {
            const dimension = getDimension(params.dimension);
            const pos: Vector3 = {x: params.x, y: params.y, z: params.z};
            const block = dimension.getBlock(pos);
            if (!block?.hasComponent("exnihilo:barrel")) {
                throw new Error(`Block at ${params.x}, ${params.y}, ${params.z} in ${params.dimension} is not an ExNihilo barrel.`);
            }

            component.empty(block);
        },

        barrelGet: (params): BarrelState => {
            const dimension = getDimension(params.dimension);
            const pos: Vector3 = {x: params.x, y: params.y, z: params.z};
            const block = dimension.getBlock(pos);
            const isBarrel = block?.hasComponent("exnihilo:barrel") ?? false;

            const state = block && isBarrel
                ? component.getState(block)
                : {input: "exnihilo:default", filling: 0};

            return {input: state.input, filling: state.filling, isBarrel};
        },
    });
}