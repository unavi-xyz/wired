import { TemplatedApp } from "uWebSockets.js";

import { World } from "./World";

export class WorldRegistry {
  readonly server: TemplatedApp;

  #store = new Map<string, World>();

  constructor(server: TemplatedApp) {
    this.server = server;
  }

  getWorld(uri: string) {
    return this.#store.get(uri);
  }

  getOrCreateWorld(uri: string) {
    const world = this.#store.get(uri);
    if (world) return world;

    const newSpace = new World(uri, this);
    this.#store.set(uri, newSpace);
    return newSpace;
  }

  removeWorld(uri: string) {
    this.#store.delete(uri);
  }
}
