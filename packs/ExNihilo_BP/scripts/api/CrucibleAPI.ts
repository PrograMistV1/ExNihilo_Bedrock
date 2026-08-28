import {Dimension, Vector3, world} from "@minecraft/server";
import {core} from '@bedrock-core/server-runtime';
import {CrucibleComponent} from "../components/blocks/CrucibleComponent";
import {BlockInput} from "../components/blocks/tiles/FilledTileEntityBlock";

/**
 * CrucibleAPI - a bedrock-core RPC-based external API for controlling ExNihilo crucibles.
 *
 * Reachable from any other bedrock-core addon via:
 *
 *   const exnihilo = core.rpc.typed<CrucibleRPC>('exnihilo');
 *   await exnihilo.crucibleSet({ dimension: 'minecraft:overworld', x: 0, y: 64, z: 0, input: 'exnihilo:lava', filling: 100 });
 *   await exnihilo.crucibleEmpty({ dimension: 'minecraft:overworld', x: 0, y: 64, z: 0 });
 *   const state = await exnihilo.crucibleGet({ dimension: 'minecraft:overworld', x: 0, y: 64, z: 0 });
 */

const VALID_INPUTS: ReadonlySet<string> = new Set<BlockInput>([
    "exnihilo:default",
    "exnihilo:gravel",
    "exnihilo:compost",
    "exnihilo:lava",
    "exnihilo:water",
]);

export type CruciblePosition = {
    dimension: string;
    x: number;
    y: number;
    z: number;
};

export type CrucibleSetParams = CruciblePosition & {
    input: string;
    filling?: number;
};

export type CrucibleState = {
    input: string;
    filling: number;
    isCrucible: boolean;
};

export interface CrucibleRPC {
    crucibleSet(params: CrucibleSetParams): void;

    crucibleEmpty(params: CruciblePosition): void;

    crucibleGet(params: CruciblePosition): CrucibleState;
}

function getDimension(id: string): Dimension {
    try {
        return world.getDimension(id);
    } catch {
        throw new Error(`Unknown dimension: ${id}`);
    }
}

/**
 * Registers the RPC handlers for the crucible API.
 * Must be called with the *same* CrucibleComponent instance that was registered
 * via `blockComponentRegistry.registerCustomComponent`.
 */
export function registerCrucibleAPI(component: CrucibleComponent): void {
    core.rpc.serve<CrucibleRPC>({
        crucibleSet: (params) => {
            if (!VALID_INPUTS.has(params.input)) {
                throw new Error(`Invalid input type "${params.input}". Valid values: ${[...VALID_INPUTS].join(", ")}`);
            }

            const dimension = getDimension(params.dimension);
            const pos: Vector3 = {x: params.x, y: params.y, z: params.z};
            const block = dimension.getBlock(pos);
            if (!block?.hasComponent("exnihilo:crucible")) {
                throw new Error(`Block at ${params.x}, ${params.y}, ${params.z} in ${params.dimension} is not an ExNihilo crucible.`);
            }

            component.setState(block, params.input as BlockInput, params.filling ?? 100);
        },

        crucibleEmpty: (params) => {
            const dimension = getDimension(params.dimension);
            const pos: Vector3 = {x: params.x, y: params.y, z: params.z};
            const block = dimension.getBlock(pos);
            if (!block?.hasComponent("exnihilo:crucible")) {
                throw new Error(`Block at ${params.x}, ${params.y}, ${params.z} in ${params.dimension} is not an ExNihilo crucible.`);
            }

            component.empty(block);
        },

        crucibleGet: (params): CrucibleState => {
            const dimension = getDimension(params.dimension);
            const pos: Vector3 = {x: params.x, y: params.y, z: params.z};
            const block = dimension.getBlock(pos);
            const isCrucible = block?.hasComponent("exnihilo:crucible") ?? false;

            const state = isCrucible && block
                ? component.getState(block)
                : {input: "exnihilo:default", filling: 0};

            return {input: state.input, filling: state.filling, isCrucible};
        },
    });
}