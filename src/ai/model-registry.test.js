/** @jest-environment jsdom */
import {
  MODEL_REGISTRY,
  MODEL_LOG_KEY,
  resolveModel,
  recordModelTransition,
  getModelTransitionLog,
} from "./model-registry.js";

beforeEach(() => localStorage.clear());

describe("resolveModel — 現行モデル", () => {
  test("現行 Claude モデルは素通し", () => {
    const r = resolveModel("claude-opus-4-7");
    expect(r.id).toBe("claude-opus-4-7");
    expect(r.replaced).toBe(false);
    expect(r.info.family).toBe("claude");
    expect(r.requestedId).toBe("claude-opus-4-7");
  });

  test("現行 GPT モデルは素通し", () => {
    const r = resolveModel("gpt-4o");
    expect(r.replaced).toBe(false);
    expect(r.info.family).toBe("openai");
  });

  test("現行 Gemini モデルは素通し", () => {
    const r = resolveModel("gemini-2.0-flash");
    expect(r.replaced).toBe(false);
    expect(r.info.family).toBe("gemini");
  });
});

describe("resolveModel — 退役モデルの後継解決", () => {
  test("Claude 3.5 Sonnet は Sonnet 4.6 に解決される", () => {
    const r = resolveModel("claude-3-5-sonnet-20240620");
    expect(r.id).toBe("claude-sonnet-4-6");
    expect(r.replaced).toBe(true);
    expect(r.info.family).toBe("claude");
    expect(r.requestedId).toBe("claude-3-5-sonnet-20240620");
  });

  test("Claude 3 Haiku は Haiku 4.5 に解決される", () => {
    const r = resolveModel("claude-3-haiku-20240307");
    expect(r.id).toBe("claude-haiku-4-5-20251001");
    expect(r.replaced).toBe(true);
  });

  test("Claude 3 Opus は Opus 4.7 に解決される", () => {
    const r = resolveModel("claude-3-opus-20240229");
    expect(r.id).toBe("claude-opus-4-7");
    expect(r.replaced).toBe(true);
  });
});

describe("resolveModel — 未知モデル", () => {
  test("未知モデルは素通し（id 維持・info=null）", () => {
    const r = resolveModel("unknown-model-id");
    expect(r.id).toBe("unknown-model-id");
    expect(r.replaced).toBe(false);
    expect(r.info).toBeNull();
  });
});

describe("recordModelTransition / getModelTransitionLog", () => {
  test("差分がない場合は記録しない", () => {
    const entry = recordModelTransition("claude-opus-4-7", "claude-opus-4-7", "chat");
    expect(entry).toBeNull();
    expect(getModelTransitionLog()).toEqual([]);
  });

  test("差分がある場合は localStorage に記録される", () => {
    const entry = recordModelTransition("claude-3-haiku-20240307", "claude-haiku-4-5-20251001", "chat");
    expect(entry.requestedId).toBe("claude-3-haiku-20240307");
    expect(entry.resolvedId).toBe("claude-haiku-4-5-20251001");
    expect(entry.phase).toBe("chat");

    const logs = getModelTransitionLog();
    expect(logs).toHaveLength(1);
    expect(logs[0].resolvedId).toBe("claude-haiku-4-5-20251001");
  });

  test("複数回の遷移が累積される", () => {
    recordModelTransition("a", "b");
    recordModelTransition("c", "d");
    expect(getModelTransitionLog()).toHaveLength(2);
  });

  test("ログキーは aico_modelVersionLog", () => {
    recordModelTransition("a", "b");
    expect(localStorage.getItem(MODEL_LOG_KEY)).not.toBeNull();
    expect(MODEL_LOG_KEY).toBe("aico_modelVersionLog");
  });
});

describe("MODEL_REGISTRY 整合性", () => {
  test("すべての replacement 先がレジストリに存在する", () => {
    for (const [id, info] of Object.entries(MODEL_REGISTRY)) {
      if (info.replacement) {
        expect(MODEL_REGISTRY[info.replacement]).toBeDefined();
        // 後継モデルは退役済みであってはならない
        expect(MODEL_REGISTRY[info.replacement].retiredAt).toBeNull();
      }
    }
  });

  test("退役モデルには retiredAt と replacement が設定されている", () => {
    for (const [id, info] of Object.entries(MODEL_REGISTRY)) {
      if (info.retiredAt) {
        expect(info.replacement).not.toBeNull();
      }
    }
  });
});
