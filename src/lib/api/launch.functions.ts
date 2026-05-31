import { createServerFn } from "@tanstack/react-start";

export const getLaunchIntegrations = createServerFn({ method: "GET" }).handler(
  async () => {
    await import("@/lib/load-env.server");
    const [{ getAiEnvStatus }, { hasAiBackend }, { getIntegrationsStatus }, { verifyAiConnection }] =
      await Promise.all([
        import("@/lib/env.server"),
        import("@/lib/ai-config.server"),
        import("@/lib/gtm/sponsor-config.server"),
        import("@/lib/swarm/llm.server"),
      ]);
    const aiEnv = getAiEnvStatus();
    const verify = hasAiBackend() ? await verifyAiConnection() : null;
    return {
      ...getIntegrationsStatus(),
      ai: Boolean(verify?.ok),
      aiEnv,
      anthropicEnv: aiEnv,
      verify,
    };
  },
);

export const testAnthropicApi = createServerFn({ method: "GET" }).handler(async () => {
  await import("@/lib/load-env.server");
  const [{ getAiEnvStatus }, { hasAiBackend }, { verifyAiConnection }] = await Promise.all([
    import("@/lib/env.server"),
    import("@/lib/ai-config.server"),
    import("@/lib/swarm/llm.server"),
  ]);
  const aiEnv = getAiEnvStatus();
  const verify = hasAiBackend() ? await verifyAiConnection() : null;
  return { ok: Boolean(verify?.ok), aiEnv, verify };
});
