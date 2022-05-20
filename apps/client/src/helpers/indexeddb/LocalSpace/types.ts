import { Scene } from "@wired-xr/scene";

export type LocalSpace = {
  id: string;
  name: string;
  description: string;
  image?: File;
  generatedImage?: File;

  scene: Scene;
};
