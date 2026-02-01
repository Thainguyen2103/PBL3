import React, { useEffect, useCallback } from 'react';
import ReactFlow, { 
    useNodesState, 
    useEdgesState, 
    Background, 
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css'; 
import dagre from 'dagre';
import KanjiGraphNode from './KanjiGraphNode';
import { searchAndGraphData as dictionaryData } from "../utils/kanji-dictionary";

const nodeTypes = { kanjiCard: KanjiGraphNode };

const getLayoutedElements = (rootChar, onNodeClick) => {
    const nodes = [];
    const edges = [];
    const visited = new Set(); 

    const findKanjiData = (char) => {
        return dictionaryData.find(k => k.kanji === char) || null;
    };

    const traverse = (char, parentId = null, depth = 0) => {
        if (depth > 5) return; 
        if (!char) return;

        const nodeId = parentId ? `${parentId}_${char}` : char;
        const info = findKanjiData(char);
        const label = info ? info.hanviet : "Thành phần";
        
        nodes.push({
            id: nodeId,
            type: 'kanjiCard',
            data: { 
                char: char, 
                hanviet: label, 
                isRoot: !parentId,
                onNodeClick: onNodeClick 
            },
            position: { x: 0, y: 0 }, 
        });

        if (parentId) {
            edges.push({
                id: `e-${parentId}-${nodeId}`,
                source: parentId,
                target: nodeId,
                // 🔥 CẤU HÌNH DÂY NỐI TÂM
                type: 'straight', // Dây thẳng nối 2 tâm
                animated: true,   // Hiệu ứng nét đứt
                style: { 
                    stroke: '#94a3b8', 
                    strokeWidth: 2,
                    strokeDasharray: '5,5', // Làm nét đứt rõ hơn
                },
            });
        }

        if (info && info.components) {
            const comps = info.components.split(/,|、| /).map(c => c.trim()).filter(c => c && c !== char);
            comps.forEach(childChar => {
                if (childChar !== parentId) {
                    traverse(childChar, nodeId, depth + 1);
                }
            });
        }
    };

    if (rootChar) traverse(rootChar);

    // --- CẤU HÌNH DAGRE (KHOẢNG CÁCH) ---
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setGraph({ 
        rankdir: 'TB', 
        nodesep: 100,  // Khoảng cách ngang (tăng lên vì hình tròn to)
        ranksep: 180   // Khoảng cách dọc (tăng lên để dây dài đẹp)
    });
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((node) => {
        // Khai báo kích thước node cho thuật toán tính toán (w-32 ~ 130px)
        dagreGraph.setNode(node.id, { width: 140, height: 140 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        if(nodeWithPosition) {
            // Căn chỉnh tâm node vào toạ độ
            node.position = {
                x: nodeWithPosition.x - 70, // 140/2
                y: nodeWithPosition.y - 70, // 140/2
            };
        }
        return node;
    });

    return { nodes: layoutedNodes, edges };
};

const KanjiInteractiveGraph = ({ rootChar, onNavigate }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();

    const onNodeClick = useCallback((char) => {
        if (onNavigate) onNavigate(char);
    }, [onNavigate]);

    useEffect(() => {
        if (!rootChar) return;
        try {
            const { nodes: lNodes, edges: lEdges } = getLayoutedElements(rootChar, onNodeClick);
            setNodes(lNodes);
            setEdges(lEdges);
            setTimeout(() => { fitView({ padding: 0.2, duration: 800 }); }, 100);
        } catch (err) { console.error(err); }
    }, [rootChar, onNodeClick, setNodes, setEdges, fitView]);

    return (
        <div className="w-full h-full bg-[#f8fafc]">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.1}
                maxZoom={2}
                attributionPosition="bottom-right"
            >
                {/* Lưới nền dạng chấm (Dots) đẹp hơn cho kiểu mạng lưới */}
                <Background color="#cbd5e1" variant="dots" gap={30} size={2} />
                <Controls className="!bg-white !shadow-lg !border-none !rounded-xl" />
                <MiniMap 
                    nodeColor="#1e293b" 
                    maskColor="rgba(240, 240, 240, 0.6)"
                    className="!bg-white !shadow-lg !rounded-lg"
                />
            </ReactFlow>
        </div>
    );
};

const KanjiGraphWrapper = (props) => (
    <div style={{ width: '100%', height: '100%' }}>
        <ReactFlowProvider>
            <KanjiInteractiveGraph {...props} />
        </ReactFlowProvider>
    </div>
);

export default KanjiGraphWrapper;