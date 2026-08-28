import {Dimension, world} from "@minecraft/server";
import {SieveComponent} from "../components/blocks/SieveComponent";

/**
 * SieveAPI - a bedrock-core RPC-based external API for reading ExNihilo sieves.
 *
 * Sieves don't have a "set absolute state" concept like barrels/crucibles (mesh is placed by
 * hand, progress advances by clicks), so this exposes read-only queries plus mesh removal.
 *
 *   const exnihilo = core.rpc.typed<SieveRPC>('exnihilo');
 *   const state = await exnihilo.sieveGet({ dimension: 'minecraft:overworld', x: 0, y: 64, z: 0 });
 */

export type SievePosition = {
    dimension: string;
    x: number;
    y: number;
    z: number;
};

export type SieveState = {
    isSieve: boolean;
    mesh: string;
    input?: string;
};

export interface SieveRPC {
    sieveGet(params: SievePosition): SieveState;
}

function getDimension(id: string): Dimension {
    try {
        return world.getDimension(id);
    } catch {
        throw new Error(`Unknown dimension: ${id}`);
    }
}

/**
 * Registers the RPC handlers for the sieve API.
 * Needs the same SieveComponent instance registered via
 * `blockComponentRegistry.registerCustomComponent`, plus its exposed read accessors
 * (add `getMeshTypePublic`/`getInputBlockPublic` wrappers on SieveComponent if not already public).
 */
export function registerSieveAPI(component: SieveComponent): void {

}