import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
let core;
const state = () => ({
  version: 1,
  rewards: [],
  redemptions: [],
  settings: { projectId: "", weeklyGoal: 20, view: "grid" },
});
beforeAll(() => {
  vi.useFakeTimers();
  const html = readFileSync("gamification/index.html", "utf8");
  document.documentElement.innerHTML = html;
  new Function(html.match(/<script>([\s\S]*)<\/script>/)[1])();
  core = window.RewardsCore;
});
afterAll(() => vi.useRealTimers());
describe("Saldo e semanas", () => {
  it("inicia na segunda, inclusive em virada de ano e domingo", () => {
    expect(core.weekDates(new Date(2027, 0, 3, 10))[0]).toBe("2026-12-28");
    expect(core.weekDates(new Date(2027, 0, 4, 0))[0]).toBe("2027-01-04");
  });
  it("não duplica tarefas arquivadas nem subtarefas", () => {
    const tasks = [
      { id: "p", timeSpentOnDay: { "2026-10-01": 3600000 } },
      { id: "p", timeSpentOnDay: { "2026-10-01": 7200000 } },
      { id: "c", parentId: "p", timeSpentOnDay: { "2026-10-01": 3600000 } },
    ];
    expect(core.metrics(tasks, state(), new Date(2026, 9, 1, 12)).earned).toBe(
      7200000,
    );
  });
  it("ignora futuro, duração negativa e dados não numéricos", () => {
    const tasks = [
      {
        id: "a",
        timeSpentOnDay: {
          "2026-09-28": -5,
          "2026-09-29": "100",
          "2026-10-01": 3600000,
          "2026-10-02": 7200000,
        },
      },
    ];
    expect(core.metrics(tasks, state(), new Date(2026, 9, 1)).earned).toBe(
      3600000,
    );
  });
  it("filtra o projeto, desconta gastos desta semana e mantém gastos ao mudar filtro", () => {
    const s = state();
    s.settings.projectId = "study";
    s.redemptions = [
      { week: "2026-09-28", costMs: 3600000 },
      { week: "2026-09-21", costMs: 999999 },
      { week: "2026-09-28", costMs: 999999, undone: true },
    ];
    const tasks = [
      {
        id: "a",
        projectId: "study",
        timeSpentOnDay: { "2026-10-01": 7200000 },
      },
      {
        id: "b",
        projectId: "other",
        timeSpentOnDay: { "2026-10-01": 7200000 },
      },
    ];
    const m = core.metrics(tasks, s, new Date(2026, 9, 1));
    expect(m.earned).toBe(7200000);
    expect(m.balance).toBe(3600000);
  });
  it("não transfere saldo e não mostra saldo negativo após correção de horas", () => {
    const s = state();
    s.redemptions = [{ week: "2026-09-28", costMs: 3600000 }];
    expect(core.metrics([], s, new Date(2026, 9, 1)).balance).toBe(0);
    expect(core.metrics([], s, new Date(2026, 9, 5)).spent).toBe(0);
  });
});
describe("Persistência e imagens", () => {
  it("distingue instalação nova de dados corrompidos", () => {
    expect(core.validateState(null).rewards).toEqual([]);
    expect(() => core.validateState("{bad")).toThrow();
    expect(() => core.validateState('{"version":2,"rewards":[]}')).toThrow();
  });
  it("rejeita custo inválido para impedir resgate com crédito", () => {
    const s = state();
    s.rewards = [{ id: "1", name: "x", kind: "Filme", costMs: -1 }];
    expect(() => core.validateState(s)).toThrow();
  });
  it("aceita URL e imagem embutida, rejeita script e credenciais", () => {
    expect(core.validImage("https://example.org/photo.png")).toBe(
      "https://example.org/photo.png",
    );
    expect(core.validImage("data:image/jpeg;base64,YQ==")).toBeTruthy();
    expect(core.validImage("javascript:alert(1)")).toBe("");
    expect(core.validImage("https://user:pass@example.org/photo")).toBe("");
    expect(core.validImage("data:image/svg+xml,<svg/>")).toBe("");
  });
});
