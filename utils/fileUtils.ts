import * as XLSX from 'xlsx';
import { SimulationCase } from '../types';

export const exportToExcel = (simulations: SimulationCase[]) => {
  const wb = XLSX.utils.book_new();

  simulations.forEach((sim) => {
    // Prepare data for sheet
    const sheetData = sim.data.map((pt) => ({
      'Crank Angle (deg)': pt.cad,
      'Pressure (bar)': pt.pressure,
      'Volume (m3)': pt.volume,
      'HRR (J/deg)': pt.hrr,
      'CHR (J)': pt.chr
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    
    // Sheet name limited to 31 chars
    const sheetName = `Shift ${sim.shift} deg`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `Combustion_Analysis_Export_${Date.now()}.xlsx`);
};

export const downloadChartAsImage = (containerId: string, title: string) => {
  const svg = document.querySelector(`#${containerId} .recharts-surface`) as SVGSVGElement;
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();

  // Get dimensions from the SVG viewbox or client rect
  const svgSize = svg.getBoundingClientRect();
  canvas.width = svgSize.width;
  canvas.height = svgSize.height;

  img.onload = () => {
    if (ctx) {
      // White background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    }
  };

  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
};
