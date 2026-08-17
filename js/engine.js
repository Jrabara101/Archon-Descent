// ============================================================================
// --- A* PATHFINDING ALGORITHM ---
// ============================================================================

class AStar {
    static findPath(map, width, height, start, end, avoidEnemies = []) {
        const openSet = [];
        const closedSet = new Set();
        const startNode = { x: start.x, y: start.y, g: 0, h: this.heuristic(start, end), f: 0, parent: null };
        startNode.f = startNode.g + startNode.h;
        openSet.push(startNode);
        
        while (openSet.length > 0) {
            let lowestIdx = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[lowestIdx].f) lowestIdx = i;
            }
            const current = openSet[lowestIdx];
            if (current.x === end.x && current.y === end.y) {
                const path = [];
                let curr = current;
                while (curr !== null) {
                    path.push({ x: curr.x, y: curr.y });
                    curr = curr.parent;
                }
                return path.reverse().slice(1);
            }
            openSet.splice(lowestIdx, 1);
            closedSet.add(`${current.x},${current.y}`);
            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];
            
            for (const neighbor of neighbors) {
                if (neighbor.x < 0 || neighbor.x >= width || neighbor.y < 0 || neighbor.y >= height) continue;
                const tile = map[neighbor.y][neighbor.x];
                if (tile === 0 || tile === 4 || tile === 9 || tile === 10) continue; // Wall, Destructible, Secret, Class-Locked
                if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;
                
                // Avoid other enemies if flagged
                if (avoidEnemies.some(e => e.x === neighbor.x && e.y === neighbor.y && !(e.x === end.x && e.y === end.y))) continue;

                const gScore = current.g + 1;
                let neighborNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
                if (!neighborNode) {
                    neighborNode = { x: neighbor.x, y: neighbor.y, g: gScore, h: this.heuristic(neighbor, end), f: 0, parent: current };
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    openSet.push(neighborNode);
                } else if (gScore < neighborNode.g) {
                    neighborNode.g = gScore;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    neighborNode.parent = current;
                }
            }
        }
        return [];
    }

    static heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
}
