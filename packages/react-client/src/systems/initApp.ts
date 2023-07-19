import { Asset, CoreStore } from "lattice-engine/core";
import { CascadingShadowMaps } from "lattice-engine/csm";
import { InputStruct } from "lattice-engine/input";
import {
  GlobalTransform,
  Parent,
  SceneStruct,
  Transform,
} from "lattice-engine/scene";
import { Commands, dropStruct, Mut, Res } from "thyseus";

import { WorldJson } from "../components";
import { createPlayerControls } from "../utils/createPlayerControls";
import { createScene } from "../utils/createScene";

export function initApp(
  commands: Commands,
  coreStore: Res<Mut<CoreStore>>,
  sceneStruct: Res<Mut<SceneStruct>>,
  inputStruct: Res<Mut<InputStruct>>
) {
  coreStore.canvas = document.querySelector("canvas");

  const { rootId, sceneId } = createScene(commands, coreStore, sceneStruct);
  const cameraId = createPlayerControls(
    [0, 8, 0],
    sceneId,
    commands,
    sceneStruct,
    inputStruct
  );

  const csm = new CascadingShadowMaps();
  csm.shadowMapSize = 4096;
  csm.far = 40;
  commands.getById(cameraId).add(csm);
  dropStruct(csm);

  const parent = new Parent(rootId);

  commands
    .spawn(true)
    .add(parent)
    .addType(Transform)
    .addType(GlobalTransform)
    .addType(Asset)
    .addType(WorldJson);

  dropStruct(parent);
}
