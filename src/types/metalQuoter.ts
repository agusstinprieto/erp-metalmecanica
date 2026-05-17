export interface Process {
    name: string;
    description: string;
    estimatedTime: string;
    confidence: number;
}

export interface GeometryStats {
    holes: number;
    bends: number;
    perimeterMm: number;
}

export interface Costs {
    material: number;
    machine: number;
    labor: number;
    total: number;
}

export interface AnalysisData {
    projectName: string;
    material: string;
    gauge: string;
    dimensions: string;
    weightKg: number;
    processes: Process[];
    geometryStats: GeometryStats;
    costs: Costs;
}
