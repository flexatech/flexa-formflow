import { describe, expect, it } from "vitest";
import type { Workflow } from "../useWorkflows";
import { NODE_H, NODE_W } from "./visual/CanvasNode";
import { layoutFlow } from "./visual/layout";
import { draftFromWorkflow, mapRun, metaFor, workflowPayload } from "./workflowModel";

const branched: Workflow = {
    id: 1,
    title: "New lead",
    status: "active",
    trigger: { type: "form_submitted", form_id: 7 },
    condition: { field: "topic", operator: "equals", value: "Sales" },
    actions: [
        { id: "a1", type: "send_email", config: { to_mode: "admin", subject: "Hi", template_id: 0 } },
        { id: "a2", type: "add_note", config: { note: "n" } },
    ],
    else_actions: [
        { id: "e1", type: "set_status", config: { status: "read" } },
        { id: "e2", type: "slack_message", config: { channel: "#leads", meta: { a: 1 } } },
    ],
    created_at: "",
    updated_at: "",
};

const linear: Workflow = { ...branched, condition: {}, else_actions: [] };

const node = (key: string, kind: "trigger" | "condition" | "action" | "add") =>
    ({ key, kind, kicker: "", title: key, icon: () => null, result: null, notRun: false }) as never;

describe("one workflow model for List and Visual", () => {
    it("round-trips a branched workflow without changing what is saved", () => {
        const draft = draftFromWorkflow(branched);
        expect(workflowPayload(draft)).toEqual({
            title: branched.title,
            status: branched.status,
            config: {
                trigger: branched.trigger,
                condition: branched.condition,
                actions: branched.actions,
                else_actions: branched.else_actions,
            },
        });
        // Loading the saved result again gives the same draft (switching views
        // never rebuilds or reorders it).
        const saved = { ...branched, ...workflowPayload(draft).config };
        expect(draftFromWorkflow(saved as Workflow)).toEqual(draft);
    });

    it("keeps a linear workflow linear: no condition, no Otherwise branch", () => {
        const draft = draftFromWorkflow(linear);
        expect(draft.condition).toBeNull();
        expect(workflowPayload(draft).config?.else_actions).toEqual([]);
        expect(workflowPayload(draft).config?.condition).toEqual({});
    });

    it("never saves the view, the selection or node positions", () => {
        const json = JSON.stringify(workflowPayload(draftFromWorkflow(branched)));
        expect(json).not.toMatch(/visual|list|selected|"x"|"y"|zoom/i);
    });

    it("keeps an unknown step type and all its settings (generic node)", () => {
        const draft = draftFromWorkflow(branched);
        expect(workflowPayload(draft).config?.else_actions?.[1]).toEqual(branched.else_actions?.[1]);
        expect(metaFor("slack_message").label).toBe("slack_message");
        expect(metaFor("slack_message").icon).toBeTruthy();
    });

    it("maps a test run onto the branch it took", () => {
        const draft = draftFromWorkflow(branched);
        const run = mapRun(
            [
                { type: "condition", status: "skipped", detail: "" },
                { type: "set_status", status: "ok", detail: "" },
            ],
            draft,
        );
        expect(run.branch).toBe("else");
        expect(run.elseActions[0]?.status).toBe("ok");
        expect(run.actions.every((r) => r === null)).toBe(true);
    });
});

describe("canvas layout", () => {
    const overlaps = (nodes: { x: number; y: number }[]) => {
        let count = 0;
        for (let i = 0; i < nodes.length; i++)
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                if (a.x < b.x + NODE_W && b.x < a.x + NODE_W && a.y < b.y + NODE_H && b.y < a.y + NODE_H) count++;
            }
        return count;
    };

    it("splits a condition into two labelled columns without overlapping nodes", () => {
        const layout = layoutFlow(
            [node("trigger", "trigger"), node("condition", "condition")],
            [node("a1", "action"), node("a2", "action"), node("add:then", "add")],
            [node("e1", "action"), node("add:else", "add")],
        );
        expect(overlaps(layout.nodes)).toBe(0);
        const x = (key: string) => layout.nodes.find((n) => n.key === key)?.x;
        expect(x("a1")).not.toBe(x("e1"));
        // The two edges leaving the condition carry their branch (If met / If not met labels).
        const branches = layout.edges.filter((e) => e.branch !== undefined).map((e) => e.branch);
        expect(branches.sort()).toEqual(["else", "then"]);
    });

    it("draws a linear flow on one axis", () => {
        const layout = layoutFlow([node("trigger", "trigger")], [node("a1", "action"), node("a2", "action"), node("add", "add")], []);
        expect(new Set(layout.nodes.map((n) => n.x)).size).toBe(1);
        expect(overlaps(layout.nodes)).toBe(0);
    });
});
