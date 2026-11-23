import { Box3, Group, Vector3 } from "three";
import type { Object3D } from "three";

// Catalog GLBs use X = width, Y = height, Z = depth. Wrap each cloned scene so
// fitting it never overwrites transforms authored on the model's root node.
export function fitFurnitureModel(
  scene: Object3D,
  size: [number, number, number],
): Group {
  const object = new Group();
  object.add(scene.clone(true));
  const bounds = new Box3().setFromObject(object);
  const extent = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  object.scale.set(
    extent.x > 1e-4 ? size[0] / extent.x : 1,
    extent.y > 1e-4 ? size[1] / extent.y : 1,
    extent.z > 1e-4 ? size[2] / extent.z : 1,
  );
  // Furniture3D places this group at height/2, so centring puts its base at Y=0.
  object.position.copy(center).multiply(object.scale).negate();
  return object;
}
