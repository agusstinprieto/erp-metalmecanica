export interface Piece {
    id: string;
    name: string;
    width: number;
    height: number;
    quantity: number;
    color: string;
}

export interface PlacedPiece extends Piece {
    x: number;
    y: number;
    rotated: boolean;
}

export interface SheetConfig {
    width: number;
    height: number;
    label: string;
    pricePerM2: number;
}

export interface Scrap {
    id: string;
    width: number;
    height: number;
    material: string;
    thickness: string;
    status: 'available' | 'reserved' | 'used';
    entryDate: string;
}

export interface NestingResult {
    placedPieces: PlacedPiece[];
    utilization: number;
    wasteArea: number;
    usedArea: number;
    totalArea: number;
    sheetsNeeded: number;
    savingsEstimate: number;
    manualWastePercent: number;
    sheetWidth?: number;
    sheetHeight?: number;
}
