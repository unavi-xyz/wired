import { Entity, GLTFMesh } from "@wired-labs/engine";
import { NextPageContext } from "next";
import { useEffect, useMemo, useRef } from "react";

import { useAppStore } from "../../app/store";
import {
  getPublicationProps,
  PublicationProps,
} from "../../client/lens/utils/getPublicationProps";
import MetaTags from "../../home/MetaTags";

export const DEFAULT_HOST = "wss://host.thewired.space";

export async function getServerSideProps({ res, query }: NextPageContext) {
  res?.setHeader("Cache-Control", "s-maxage=120");

  const id = query.id as string;
  const props = await getPublicationProps(id);

  return {
    props: {
      ...props,
      id,
    },
  };
}

interface Props extends PublicationProps {
  id: string;
}

export default function App({ id, metadata, publication }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const createdEngine = useRef(false);

  const engine = useAppStore((state) => state.engine);

  const modelURL: string | undefined =
    publication?.metadata.media[1]?.original.url;

  const spaceHost = null; // TODO: get from metadata

  const host =
    process.env.NODE_ENV === "development"
      ? "ws://localhost:4000"
      : spaceHost
      ? `wss://${spaceHost}`
      : DEFAULT_HOST;

  useEffect(() => {
    if (!engine) return;

    // TODO connect to host via WebSockets
  }, [engine, host]);

  useEffect(() => {
    if (!modelURL || !engine) return;

    // Create glTF entity
    const entity = new Entity();
    const mesh = new GLTFMesh();
    mesh.uri = modelURL;
    entity.mesh = mesh;

    // Add entity to scene
    engine.scene.addEntity(entity);

    return () => {
      engine.scene.removeEntity(entity.id);
    };
  }, [engine, modelURL]);

  useEffect(() => {
    if (createdEngine.current) return;
    createdEngine.current = true;

    async function initEngine() {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");

      const { Engine } = await import("@wired-labs/engine");

      // Create engine
      const engine = new Engine({
        canvas,
        camera: "player",
        skyboxPath: "/images/skybox/",
      });

      // Start engine
      engine.start().then(() => {
        useAppStore.setState({ engine });
      });
    }

    initEngine();
  }, [canvasRef]);

  useEffect(() => {
    if (!engine) return;

    return () => {
      engine.destroy();
      useAppStore.setState({ engine: null });
    };
  }, [engine]);

  const updateCanvasSize = useMemo(() => {
    return () => {
      if (typeof OffscreenCanvas !== "undefined") {
        if (!engine) return;
        const resize = engine.renderThread.onResize.bind(engine.renderThread);
        resize();
        return;
      }

      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const container = containerRef.current;
        if (!container) return;

        // Resize canvas
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      } catch (e) {
        console.error(e);
      }
    };
  }, [engine]);

  useEffect(() => {
    // Set initial canvas size
    updateCanvasSize();

    window.addEventListener("resize", updateCanvasSize);
    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [updateCanvasSize]);

  const loadedClass = engine ? "opacity-100" : "opacity-0";

  return (
    <>
      <MetaTags
        title={metadata.title ?? id}
        description={metadata.description ?? undefined}
        image={metadata.image ?? undefined}
        card="summary_large_image"
      />

      <div className="h-full">
        <div className="crosshair" />

        <div
          ref={containerRef}
          className="relative h-full w-full overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            className={`h-full w-full transition ${loadedClass}`}
          />
        </div>
      </div>
    </>
  );
}
