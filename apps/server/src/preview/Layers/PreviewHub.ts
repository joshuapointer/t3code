import { Layer } from "effect";

import { PreviewUrlRepositoryLive } from "../../persistence/Layers/PreviewUrls.ts";
import { PreviewHub, PreviewHubLive as PreviewHubServiceLive } from "../Services/PreviewHub.ts";
import { TailscaleFunnelLive } from "../Services/TailscaleFunnel.ts";
import { PreviewMcpServer, PreviewMcpServerLive } from "./PreviewMcpServer.ts";

export { PreviewHub, PreviewMcpServer };

export const PreviewHubLive = PreviewHubServiceLive.pipe(Layer.provide(PreviewUrlRepositoryLive));

export const PreviewMcpServerLiveComposed = PreviewMcpServerLive.pipe(
  Layer.provide(PreviewHubLive),
  Layer.provide(TailscaleFunnelLive),
);
