"use client";

import { Client } from "@wired-labs/react-client";
import { ERC721Metadata } from "contracts";
import Script from "next/script";
import { useState } from "react";

import { useHotkeys } from "../../../src/play/hooks/useHotkeys";
import RainbowkitWrapper from "../../(navbar)/RainbowkitWrapper";
import ClientApp from "./ClientApp";

interface Props {
  id: number;
  metadata: ERC721Metadata;
}

export default function App({ id, metadata }: Props) {
  const [scriptsReady, setScriptsReady] = useState(false);

  useHotkeys();

  return (
    <>
      <Script src="/scripts/draco_decoder.js" onReady={() => setScriptsReady(true)} />

      <RainbowkitWrapper>
        <div className="fixed h-screen w-screen">
          {scriptsReady && (
            <Client
              spaceId={id}
              metadata={metadata}
              animations="/models"
              avatar="/models/Wired-chan.vrm"
              skybox="/images/Skybox.jpg"
            >
              <ClientApp spaceId={id} metadata={metadata} />
            </Client>
          )}
        </div>
      </RainbowkitWrapper>
    </>
  );
}
