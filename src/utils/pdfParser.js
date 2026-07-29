/**
 * FMB PDF Parser Module
 * Extracts land survey data from government FMB/Bhu-kamatha Patamu PDF reports.
 * Uses pdfjs-dist for client-side PDF text extraction, then applies regex patterns
 * to parse metadata and coordinate tables.
 *
 * Also provides a hardcoded reference dataset from SinglePlotRepor.pdf for instant demo.
 */

/**
 * Reference dataset from SinglePlotRepor.pdf
 * Chittoor District, Shantipuram Mandal, Arimutthanapalle Village
 * Survey No: 368, 8 corner points
 */
export const REFERENCE_PLOT_DATA = {
  metadata: {
    reportTitle: 'BHU-KAMATHA PATAMU (FMB REPORT)',
    district: 'CHITTOOR',
    mandal: 'SHANTIPURAM',
    village: 'ARIMUTTHANAPALLE',
    villageCode: '1064031',
    surveyNo: '368',
    ulpin: '74R0V0DBCYAGH0',
    extent: '0.82 Cents',
    extentHectares: '0.33 Hectares',
    date: '27/07/2026 09:28:38',
    scale: '1:1000',
    datum: 'WGS 84',
    projection: 'UTM zone 44N',
  },
  points: [
    { sno: 1, lat: 12.865284, lon: 78.401884, easting: 218017.9, northing: 1423662.3, distance: 7.67, sideLp: '367' },
    { sno: 2, lat: 12.865271, lon: 78.401953, easting: 218025.4, northing: 1423660.8, distance: 36.93, sideLp: '367' },
    { sno: 3, lat: 12.865183, lon: 78.402281, easting: 218060.9, northing: 1423650.7, distance: 46.59, sideLp: '591' },
    { sno: 4, lat: 12.865046, lon: 78.402687, easting: 218104.8, northing: 1423635.1, distance: 4.15, sideLp: '370' },
    { sno: 5, lat: 12.865024, lon: 78.402717, easting: 218108.1, northing: 1423632.6, distance: 36.46, sideLp: '369' },
    { sno: 6, lat: 12.864700, lon: 78.402652, easting: 218100.7, northing: 1423596.9, distance: 59.20, sideLp: 'Side Village' },
    { sno: 7, lat: 12.864845, lon: 78.402128, easting: 218043.9, northing: 1423613.5, distance: 27.35, sideLp: 'Side Village' },
    { sno: 8, lat: 12.865009, lon: 78.401939, easting: 218023.6, northing: 1423631.8, distance: 31.03, sideLp: 'Side Village' },
  ],
};

/**
 * Parse an uploaded PDF file to extract FMB survey data
 * @param {File} file - The uploaded PDF file
 * @returns {Promise<{metadata: Object, points: Array}>}
 */
export async function parseFMBPdf(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source safely for Vite
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Sort items by Y descending (top-to-bottom), then X ascending (left-to-right)
      const items = textContent.items.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: Math.round(item.transform[5] / 4) * 4, // Group within 4px line tolerance
      }));

      items.sort((a, b) => b.y - a.y || a.x - b.x);

      // Group items into lines
      let currentY = null;
      let lineText = '';
      for (const item of items) {
        if (currentY === null || Math.abs(item.y - currentY) > 3) {
          if (lineText) fullText += lineText + '\n';
          currentY = item.y;
          lineText = item.str;
        } else {
          lineText += ' ' + item.str;
        }
      }
      if (lineText) fullText += lineText + '\n';
    }

    let parsed = extractDataFromText(fullText);
    
    // If digital text stream yielded 0 points, attempt canvas OCR via Tesseract.js
    if (parsed.points.length === 0) {
      try {
        console.log('Attempting OCR scan on image PDF page...');
        const Tesseract = await import('tesseract.js');
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await firstPage.render({ canvasContext: context, viewport }).promise;
        const imgDataUrl = canvas.toDataURL('image/png');

        const ocrResult = await Tesseract.recognize(imgDataUrl, 'eng');
        const ocrText = ocrResult.data.text;
        parsed = extractDataFromText(ocrText);
      } catch (ocrErr) {
        console.warn('OCR rendering unavailable or failed:', ocrErr);
      }
    }
    
    // Set file name in metadata
    parsed.metadata.fileName = file.name;
    
    return parsed;
  } catch (err) {
    console.error('PDF parsing failed:', err);
    return null;
  }
}

/**
 * Convert UTM coordinates (Zone 44N, EPSG:32644) to WGS84 Lat/Lon
 * Standard geodetic ellipsoid conversion algorithm
 */
function utmToLatLon(easting, northing, zone = 44, northernHemisphere = true) {
  const a = 6378137.0; // WGS84 equatorial radius
  const f = 1 / 298.257223563; // WGS84 flattening
  const k0 = 0.9996;
  const e = Math.sqrt(2 * f - f * f);
  const e1sq = (e * e) / (1 - e * e);

  const x = easting - 500000.0; // remove false easting
  const y = northernHemisphere ? northing : northing - 10000000.0;

  const longOrigin = (zone - 1) * 6 - 180 + 3; // central meridian

  const M = y / k0;
  const mu = M / (a * (1 - (e * e) / 4 - (3 * e * e * e * e) / 64 - (5 * e * e * e * e * e * e) / 256));

  const phi1Rad = mu +
    (3 * e1sq / 2 - 27 * Math.pow(e1sq, 3) / 32) * Math.sin(2 * mu) +
    (21 * Math.pow(e1sq, 2) / 16 - 55 * Math.pow(e1sq, 4) / 32) * Math.sin(4 * mu) +
    (151 * Math.pow(e1sq, 3) / 96) * Math.sin(6 * mu);

  const N1 = a / Math.sqrt(1 - e * e * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  const T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  const C1 = e1sq * Math.cos(phi1Rad) * Math.cos(phi1Rad);
  const R1 = a * (1 - e * e) / Math.pow(1 - e * e * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  const D = x / (N1 * k0);

  let lat = phi1Rad - (N1 * Math.tan(phi1Rad) / R1) * (
    (D * D) / 2 -
    (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e1sq) * Math.pow(D, 4) / 24 +
    (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e1sq - 3 * C1 * C1) * Math.pow(D, 6) / 720
  );
  lat = (lat * 180.0) / Math.PI;

  let lon = (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
    (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e1sq + 24 * T1 * T1) * Math.pow(D, 5) / 120) / Math.cos(phi1Rad);
  lon = longOrigin + (lon * 180.0) / Math.PI;

  return { lat, lon };
}

/**
 * Extract structured survey data from raw PDF text
 */
function extractDataFromText(text) {
  const metadata = {
    reportTitle: 'BHU-KAMATHA PATAMU (FMB REPORT)',
    datum: 'WGS 84',
    projection: 'UTM zone 44N',
  };

  // Extract metadata fields using robust regex
  const patterns = {
    district: /(?:District|జిల్లా|Dist)\s*[:\-]?\s*([A-Za-z0-9\s]+)/i,
    mandal: /(?:Mandal|మండలం|Tehsil)\s*[:\-]?\s*([A-Za-z0-9\s]+)/i,
    village: /(?:Village|గ్రామము|Gram)\s*(?:Name)?\s*[:\-]?\s*([A-Za-z0-9\s]+)/i,
    villageCode: /(?:Village Code|గ్రామము కోడ్|LGD Code)\s*[:\-]?\s*(\d+)/i,
    surveyNo: /(?:Survey|Sy|పటము)\s*(?:No|Number|\/)?\s*[:\-]?\s*([0-Za-z0-9\-\/]+)/i,
    ulpin: /(?:ULPIN|సంఖ్య)\s*[:\-]?\s*([A-Z0-9]+)/i,
    extent: /(?:Extent|విస్తీర్ణము)\s*[:\-]?\s*([\d.]+\s*(?:Cents|Hectares|Acres|సెంట్లు))/i,
    datum: /Datum\s*[:\-]?\s*(\S+)/i,
    projection: /Projection\s*[:\-]?\s*([\w\s\d]+Zone[\w\s\d]*)/i,
    scale: /Scale\s*[:\-]?\s*([\d:]+)/i,
  };

  for (const [key, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) metadata[key] = match[1].trim();
  }

  const points = [];
  const lines = text.split('\n');

  // Strategy 1: Line-by-line inspection matching SNo, Lat (12-13.x or 6-37.x), Lon (78-79.x or 68-98.x), Easting, Northing, Distance, SideLP
  for (const line of lines) {
    const lineTrim = line.trim();
    if (!lineTrim) continue;

    // Pattern for: [SNo] [Lat] [Lon] [Easting] [Northing] [Distance] [SideLP]
    const rowMatch = lineTrim.match(/^(\d{1,2})\s+([0-3]?\d\.\d{4,})\s+([6-9]\d\.\d{4,})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(.*)$/);
    if (rowMatch) {
      const lat = parseFloat(rowMatch[2]);
      const lon = parseFloat(rowMatch[3]);
      if (lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98) {
        points.push({
          sno: parseInt(rowMatch[1]),
          lat,
          lon,
          easting: parseFloat(rowMatch[4]),
          northing: parseFloat(rowMatch[5]),
          distance: parseFloat(rowMatch[6]),
          sideLp: rowMatch[7]?.trim() || '',
        });
      }
    }
  }

  // Strategy 2: Global scan for Lat (e.g. 12.86xxxx) and Lon (e.g. 78.40xxxx) in table text stream
  if (points.length === 0) {
    const globalPairPattern = /(\d{1,2})\s+([0-3]?\d\.\d{5,})\s+([6-9]\d\.\d{5,})(?:\s+([\d.]+))?(?:\s+([\d.]+))?(?:\s+([\d.]+))?\s*([^\n\r]*)/g;
    let match;
    while ((match = globalPairPattern.exec(text)) !== null) {
      const lat = parseFloat(match[2]);
      const lon = parseFloat(match[3]);
      if (lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98) {
        points.push({
          sno: parseInt(match[1]),
          lat,
          lon,
          easting: match[4] ? parseFloat(match[4]) : 0,
          northing: match[5] ? parseFloat(match[5]) : 0,
          distance: match[6] ? parseFloat(match[6]) : 0,
          sideLp: match[7]?.trim() || '',
        });
      }
    }
  }

  // Strategy 3: Extract isolated valid Lat/Lon floats if columns were merged into a continuous string
  if (points.length === 0) {
    const latRegex = /([0-3]?\d\.\d{5,})/g;
    const lonRegex = /([6-9]\d\.\d{5,})/g;
    const lats = Array.from(text.matchAll(latRegex), m => parseFloat(m[1])).filter(v => v >= 6 && v <= 37);
    const lons = Array.from(text.matchAll(lonRegex), m => parseFloat(m[1])).filter(v => v >= 68 && v <= 98);

    const minLen = Math.min(lats.length, lons.length);
    for (let i = 0; i < minLen; i++) {
      points.push({
        sno: i + 1,
        lat: lats[i],
        lon: lons[i],
        easting: 0,
        northing: 0,
        distance: 0,
        sideLp: `Point ${i + 1}`,
      });
    }
  }

  // Strategy 4: UTM Coordinate Table conversion fallback
  if (points.length === 0) {
    const utmPattern = /(\d{1,2})\s+([1-8]\d{5}(?:\.\d+)?)\s+([1-3]\d{6}(?:\.\d+)?)(?:\s+([\d.]+))?\s*([^\n\r]*)/g;
    let match;
    let idx = 1;
    while ((match = utmPattern.exec(text)) !== null) {
      const easting = parseFloat(match[2]);
      const northing = parseFloat(match[3]);
      const distance = match[4] ? parseFloat(match[4]) : 0;
      const sideLp = match[5]?.trim() || '';

      const { lat, lon } = utmToLatLon(easting, northing, 44, true);
      if (lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98) {
        points.push({
          sno: parseInt(match[1]) || idx++,
          lat,
          lon,
          easting,
          northing,
          distance,
          sideLp,
        });
      }
    }
  }

  return { metadata, points };
}

/**
 * Generate GeoJSON FeatureCollection from plot data
 */
export function toGeoJSON(plotData) {
  const coords = plotData.points.map(p => [p.lon, p.lat]);
  if (coords.length > 0) coords.push(coords[0]); // Close polygon

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { ...plotData.metadata },
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
    }],
  };
}

/**
 * Generate KML string from plot data (for Google Earth)
 */
export function toKML(plotData) {
  const coords = plotData.points
    .map(p => `${p.lon},${p.lat},0`)
    .join(' ');
  const firstPt = plotData.points[0];
  const closedCoords = coords + ` ${firstPt.lon},${firstPt.lat},0`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>FMB Plot - Survey No ${plotData.metadata.surveyNo || 'Unknown'}</name>
    <description>
      District: ${plotData.metadata.district || ''}
      Mandal: ${plotData.metadata.mandal || ''}
      Village: ${plotData.metadata.village || ''}
      ULPIN: ${plotData.metadata.ulpin || ''}
    </description>
    <Style id="plotStyle">
      <LineStyle><color>ff0088ff</color><width>3</width></LineStyle>
      <PolyStyle><color>4400aaff</color></PolyStyle>
    </Style>
    <Placemark>
      <name>Survey No ${plotData.metadata.surveyNo || ''}</name>
      <styleUrl>#plotStyle</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${closedCoords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    ${plotData.points.map(p => `
    <Placemark>
      <name>Point ${p.sno}</name>
      <description>Lat: ${p.lat}, Lon: ${p.lon}${p.sideLp ? `, Side LP: ${p.sideLp}` : ''}</description>
      <Point><coordinates>${p.lon},${p.lat},0</coordinates></Point>
    </Placemark>`).join('')}
  </Document>
</kml>`;
}

/**
 * Generate CSV string from plot data
 */
export function toCSV(plotData) {
  let csv = 'SNo,Latitude,Longitude,Easting,Northing,Distance(m),SideLP\n';
  plotData.points.forEach(p => {
    csv += `${p.sno},${p.lat},${p.lon},${p.easting},${p.northing},${p.distance},${p.sideLp}\n`;
  });
  return csv;
}
