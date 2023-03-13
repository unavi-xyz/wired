import { Accessor } from "@gltf-transform/core";
import { BufferAttribute, Mesh, MeshStandardMaterial, SkinnedMesh } from "three";

import { PrimitiveJSON } from "../../../scene";
import { subscribe } from "../../../utils/subscribe";
import { THREE_ATTRIBUTE_NAMES } from "../constants";
import { RenderScene } from "../RenderScene";
import { Builder } from "./Builder";

export const DEFAULT_MATERIAL = new MeshStandardMaterial();

/**
 * @internal
 * Handles the conversion of primitives to Three.js objects.
 */
export class PrimitiveBuilder extends Builder<PrimitiveJSON, Mesh | SkinnedMesh> {
  constructor(scene: RenderScene) {
    super(scene);
  }

  add(json: Partial<PrimitiveJSON>, id: string) {
    const previousObject = this.getObject(id);
    if (previousObject) throw new Error(`Primitive with id ${id} already exists.`);

    const { object: primitive } = this.scene.primitive.create(json, id);

    // Isolate object creation from subscription logic
    // Objects may be created and disposed of multiple times
    {
      const object = new Mesh();
      object.geometry.morphTargetsRelative = true;
      object.castShadow = true;
      object.receiveShadow = true;

      this.scene.root.add(object);
      this.setObject(id, object);
    }

    this.subscribeToObject(id, (object) => {
      if (!object) return;

      const cleanup: Array<() => void> = [];

      cleanup.push(
        subscribe(primitive, "Name", (value) => {
          object.name = value;
        })
      );

      cleanup.push(
        subscribe(primitive, "Material", (value) => {
          if (value) {
            const materialId = this.scene.material.getId(value);
            if (!materialId) throw new Error("Material id not found.");

            const materialObject = this.scene.builders.material.getObject(materialId);
            if (!materialObject) throw new Error("Material object not found.");

            object.material = materialObject;
          } else {
            object.material = DEFAULT_MATERIAL;
          }
        })
      );

      cleanup.push(
        subscribe(primitive, "Indices", (value) => {
          if (value) {
            const attribute = accessorToAttribute(value);
            object.geometry.setIndex(attribute);
          } else {
            object.geometry.setIndex(null);
          }
        })
      );

      cleanup.push(
        subscribe(primitive, "Attributes", (accessors) => {
          return subscribe(primitive, "Semantics", (names) => {
            // Add new attributes
            accessors.forEach((accessor, i) => {
              const name = names[i];
              if (name === undefined) throw new Error("Semantics not found");

              const threeName = THREE_ATTRIBUTE_NAMES[name as keyof typeof THREE_ATTRIBUTE_NAMES];

              const attribute = accessorToAttribute(accessor);

              if (attribute) object.geometry.setAttribute(threeName, attribute);
              else object.geometry.deleteAttribute(threeName);
            });

            return () => {
              // Remove all attributes
              Object.values(THREE_ATTRIBUTE_NAMES).forEach((name) => {
                object.geometry.deleteAttribute(name);
              });
            };
          });
        })
      );

      cleanup.push(
        subscribe(primitive, "Targets", (value) => {
          // Reset morph influences
          if (value.length === 0) object.morphTargetInfluences = undefined;
          else object.morphTargetInfluences = [];

          // Add new morph attributes
          value.forEach((target) => {
            const names = target.listSemantics();

            target.listAttributes().forEach((accessor, i) => {
              const name = names[i];
              if (name === undefined) throw new Error("Semantics not found");

              const threeName = THREE_ATTRIBUTE_NAMES[name as keyof typeof THREE_ATTRIBUTE_NAMES];

              const attribute = accessorToAttribute(accessor);

              if (attribute) {
                const morphAttributes = object.geometry.morphAttributes[threeName];
                if (morphAttributes) morphAttributes.push(attribute);
                else object.geometry.morphAttributes[threeName] = [attribute];
              } else {
                delete object.geometry.morphAttributes[threeName];
              }
            });
          });

          return () => {
            // Remove morph attributes
            Object.values(THREE_ATTRIBUTE_NAMES).forEach((name) => {
              delete object.geometry.morphAttributes[name];
            });
          };
        })
      );

      return () => {
        cleanup.forEach((fn) => fn());
      };
    });

    primitive.addEventListener("dispose", () => {
      this.setObject(id, null);
    });

    return primitive;
  }

  remove(id: string) {
    this.scene.primitive.store.get(id)?.dispose();
  }

  update(json: Partial<PrimitiveJSON>, id: string) {
    const primitive = this.scene.primitive.store.get(id);
    if (!primitive) throw new Error(`Primitive with id ${id} does not exist.`);

    this.scene.primitive.applyJSON(primitive, json);
  }
}

function accessorToAttribute(accessor: Accessor) {
  const array = accessor.getArray();
  if (!array) return null;

  return new BufferAttribute(array, accessor.getElementSize(), accessor.getNormalized());
}
