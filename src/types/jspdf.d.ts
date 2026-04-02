declare module 'jspdf' {
  class jsPDF {
    constructor(options?: {
      orientation?: 'portrait' | 'landscape';
      unit?: 'mm' | 'cm' | 'in' | 'pt';
      format?: 'a3' | 'a4' | 'a5' | 'letter' | 'legal';
    });
    
    setFontSize(size: number): jsPDF;
    setFont(font: string, style?: string): jsPDF;
    text(text: string, x: number, y: number, options?: object): jsPDF;
    save(filename: string): void;
    setTextColor(r: number, g?: number, b?: number): jsPDF;
    
    autoTable: (options: {
      startY?: number;
      head?: unknown[][];
      body?: unknown[][];
      foot?: unknown[][];
      theme?: 'striped' | 'grid' | 'plain';
      headStyles?: {
        fillColor?: number[];
        textColor?: number[];
        fontStyle?: string;
        fontSize?: number;
      };
      bodyStyles?: object;
      footStyles?: object;
      didParseCell?: (data: {
        section: 'head' | 'body' | 'foot';
        row: { index: number; cells: Record<string, unknown> };
        column: { index: number; raw: unknown; styles: object };
        cell: { x: number; y: number; w: number; h: number; text: string; styles: object };
      }) => void;
      didDrawCell?: (data: unknown) => void;
    }) => jsPDF;
  }
  
  export = jsPDF;
}

declare module 'jspdf-autotable' {
  const autoTable: (doc: unknown, options: unknown) => void;
  export = autoTable;
}
