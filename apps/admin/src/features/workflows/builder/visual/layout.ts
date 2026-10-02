import {
    COLUMN_GAP,
    NODE_GAP,
    NODE_H,
    NODE_W,
    type CanvasEdge,
    type CanvasNodeModel,
    type PlacedNode,
} from "./CanvasNode";

/** Extra drop below the condition, room for the elbow and the branch labels. */
const BRANCH_DROP = NODE_GAP + 36;

export interface FlowLayout {
    nodes: PlacedNode[];
    edges: CanvasEdge[];
    width: number;
    height: number;
}

/**
 * Place the flow's nodes. Positions are derived from the order alone, so
 * nothing about the layout is stored. Without branches it is one column; with
 * them, the trigger and condition sit centred over two columns, If met on the
 * left and If not met on the right, each ending in its own "Add step".
 *
 * `head` is the trigger and the condition (if any); `then` / `other` are the
 * branch columns (actions then their "Add step"). Without a condition `then`
 * is the only column and `other` is empty.
 */
export function layoutFlow(head: CanvasNodeModel[], then: CanvasNodeModel[], other: CanvasNodeModel[]): FlowLayout {
    const step = NODE_H + NODE_GAP;
    const bottomCenter = (n: PlacedNode) => ({ x: n.x + NODE_W / 2, y: n.y + NODE_H });
    const topCenter = (n: PlacedNode) => ({ x: n.x + NODE_W / 2, y: n.y - 2 });
    const chain = (list: PlacedNode[], edges: CanvasEdge[]) => {
        for (let i = 1; i < list.length; i++) {
            edges.push({
                key: `${list[i - 1].key}->${list[i].key}`,
                from: bottomCenter(list[i - 1]),
                to: topCenter(list[i]),
                dashed: list[i].kind === "add",
            });
        }
    };

    const edges: CanvasEdge[] = [];

    if (other.length === 0) {
        const nodes = [...head, ...then].map((n, i) => ({ ...n, x: 0, y: i * step }));
        chain(nodes, edges);
        return { nodes, edges, width: NODE_W, height: nodes.length * NODE_H + (nodes.length - 1) * NODE_GAP };
    }

    const width = NODE_W * 2 + COLUMN_GAP;
    const centreX = (width - NODE_W) / 2;
    const top = head.map((n, i) => ({ ...n, x: centreX, y: i * step }));
    const branchTop = (top.length - 1) * step + NODE_H + BRANCH_DROP;
    const left = then.map((n, i) => ({ ...n, x: 0, y: branchTop + i * step }));
    const right = other.map((n, i) => ({ ...n, x: NODE_W + COLUMN_GAP, y: branchTop + i * step }));

    chain(top, edges);
    const condition = top[top.length - 1];
    if (left[0]) {
        edges.push({
            key: "branch-then",
            from: bottomCenter(condition),
            to: topCenter(left[0]),
            dashed: false,
            branch: "then",
        });
    }
    if (right[0]) {
        edges.push({
            key: "branch-else",
            from: bottomCenter(condition),
            to: topCenter(right[0]),
            dashed: false,
            branch: "else",
        });
    }
    chain(left, edges);
    chain(right, edges);

    const rows = Math.max(left.length, right.length);
    return {
        nodes: [...top, ...left, ...right],
        edges,
        width,
        height: branchTop + rows * NODE_H + (rows - 1) * NODE_GAP,
    };
}
