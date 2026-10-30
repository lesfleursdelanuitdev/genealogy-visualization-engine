// @vitest-environment jsdom
/**
 * useChartViewFetch with an injected fetchGraph (refactor plan phase 4): the engine builds
 * no URLs; the app passes a function that returns { people, unions, … }.
 * Repros H2 and B07 (from test/bugs) live here now that they pass.
 */
import { describe, it, expect } from "vitest";
import { renderHook, settle, deferred, type Deferred } from "./helpers/renderHook";
import { person, union } from "./helpers/graph";
import {
  useChartViewFetch,
  type ChartGraphRequest,
  type ChartGraphResponse,
  type FetchChartGraph,
  type UseChartViewFetchOptions,
} from "../src";

const graphFor = (rootId: string, name: string): ChartGraphResponse => ({
  rootId,
  people: [person(rootId, name)],
  unions: [],
});

function recordingFetch() {
  const calls: ChartGraphRequest[] = [];
  const pending: Deferred<ChartGraphResponse>[] = [];
  const fetchGraph: FetchChartGraph = (request) => {
    calls.push(request);
    const d = deferred<ChartGraphResponse>();
    pending.push(d);
    return d.promise;
  };
  return { calls, pending, fetchGraph };
}

function render(options: UseChartViewFetchOptions) {
  return renderHook((o: UseChartViewFetchOptions) => useChartViewFetch(o), options);
}

describe("useChartViewFetch(fetchGraph)", () => {
  it("asks fetchGraph for the chart type, root and depth, with an abort signal", async () => {
    const f = recordingFetch();
    const h = await render({ fetchGraph: f.fetchGraph, strategyName: "pedigree", rootId: "@A@", maxDepth: 4 });
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]).toMatchObject({ strategy: "pedigree", rootId: "@A@", depth: 4 });
    expect(f.calls[0].signal).toBeInstanceOf(AbortSignal);
    await h.unmount();
  });

  it("passes the pedigree family choices and the sibling-view person through", async () => {
    const f = recordingFetch();
    const h = await render({
      fetchGraph: f.fetchGraph,
      strategyName: "descendancy",
      rootId: "@A@",
      maxDepth: 3,
      siblingViewPersonId: "@S@",
      pedigreeFamcFamilyXref: "@F2@",
      pedigreeFamcOverrides: { "@X@": "@F9@" },
    });
    expect(f.calls[0]).toMatchObject({
      siblingViewPersonId: "@S@",
      pedigreeFamcFamilyXref: "@F2@",
      pedigreeFamcOverrides: { "@X@": "@F9@" },
    });
    await h.unmount();
  });

  it("builds an adapter and graph from the answer and stops loading", async () => {
    const f = recordingFetch();
    const h = await render({ fetchGraph: f.fetchGraph, strategyName: "descendancy", rootId: "@A@", maxDepth: 4 });
    expect(h.current.isChartLoading).toBe(true);
    f.pending[0].resolve({
      rootId: "@A@",
      people: [person("@A@", "Ann"), person("@B@", "Ben")],
      unions: [union("@F1@", "@B@", "@A@", [])],
    });
    await settle();
    expect(h.current.isChartLoading).toBe(false);
    expect(h.current.error).toBeNull();
    expect(h.current.lastApiRootId).toBe("@A@");
    expect(h.current.chartAdapter?.strategyName).toBe("descendancy");
    expect(h.current.graph?.spousesOf("@A@").map((s) => s.spouseId)).toEqual(["@B@"]);
    await h.unmount();
  });

  it("[H2 fixed] after a quick A→B root switch, A's late answer does not replace B's chart", async () => {
    const f = recordingFetch();
    const base = { fetchGraph: f.fetchGraph, strategyName: "descendancy" as const, maxDepth: 4 };
    const h = await render({ ...base, rootId: "@A@" });
    await h.rerender({ ...base, rootId: "@B@" });
    expect(f.calls.map((c) => c.rootId)).toEqual(["@A@", "@B@"]);
    expect(f.calls[0].signal.aborted).toBe(true);

    f.pending[1].resolve(graphFor("@B@", "Bea"));
    await settle();
    f.pending[0].resolve(graphFor("@A@", "Ann"));
    await settle();

    expect(h.current.lastApiRootId).toBe("@B@");
    expect(h.current.graph?.people.has("@B@")).toBe(true);
    expect(h.current.graph?.people.has("@A@")).toBe(false);
    await h.unmount();
  });

  it("[B07 fixed] an answer that is already there does not leave the chart loading", async () => {
    const fetchGraph: FetchChartGraph = () => Promise.resolve(graphFor("@A@", "Ann"));
    const h = await render({ fetchGraph, strategyName: "descendancy", rootId: "@A@", maxDepth: 4 });
    await settle();
    expect(h.current.isChartLoading).toBe(false);
    expect(h.current.lastApiRootId).toBe("@A@");
    await h.unmount();
  });

  it("reports a failed fetch as an error, not a console message", async () => {
    const fetchGraph: FetchChartGraph = () => Promise.reject(new Error("503 Service Unavailable"));
    const h = await render({ fetchGraph, strategyName: "descendancy", rootId: "@A@", maxDepth: 4 });
    await settle();
    expect(h.current.isChartLoading).toBe(false);
    expect(h.current.chartAdapter).toBeNull();
    expect(h.current.error?.message).toBe("503 Service Unavailable");
    await h.unmount();
  });

  it("hands sibling-view meta to onSiblingViewMeta and keeps multiFamilyChildXrefs", async () => {
    const seen: unknown[] = [];
    const siblingView = { personId: "@S@", spouseCatchAlls: [], adoptiveUnions: [], adoptiveCatchAlls: [] };
    const fetchGraph: FetchChartGraph = () =>
      Promise.resolve({ ...graphFor("@A@", "Ann"), siblingView, multiFamilyChildXrefs: ["@A@"] });
    const h = await render({
      fetchGraph,
      strategyName: "descendancy",
      rootId: "@A@",
      maxDepth: 4,
      siblingViewPersonId: "@S@",
      onSiblingViewMeta: (sv) => seen.push(sv),
    });
    await settle();
    expect(seen).toEqual([siblingView]);
    expect(h.current.pedigreeMultiFamilyChildXrefs).toEqual(["@A@"]);
    await h.unmount();
  });

  it("does not refetch when only the fetchGraph function identity changes", async () => {
    const f = recordingFetch();
    const h = await render({ fetchGraph: f.fetchGraph, strategyName: "descendancy", rootId: "@A@", maxDepth: 4 });
    await h.rerender({ fetchGraph: (r) => f.fetchGraph(r), strategyName: "descendancy", rootId: "@A@", maxDepth: 4 });
    expect(f.calls).toHaveLength(1);
    await h.unmount();
  });
});
