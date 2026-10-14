import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  fileName?: string;
  testatorName?: string;
}

/**
 * Generates and triggers a direct PDF download of the legal will document element.
 */
export async function downloadElementAsPdf(
  elementId: string,
  options: PdfExportOptions = {}
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found for PDF export.`);
    return false;
  }

  try {
    // Render the element to a high-resolution canvas
    const canvas = await html2canvas(element, {
      scale: 2, // 2x resolution for razor-sharp legal print quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First Page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    // Subsequent Pages if document spans multiple pages
    let pageNum = 1;
    while (heightLeft > 0) {
      position = position - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
      pageNum++;
    }

    // Clean filename
    const safeName = options.testatorName
      ? options.testatorName.replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'Draft';
    const finalFileName = options.fileName || `Last_Will_and_Testament_${safeName}.pdf`;

    pdf.save(finalFileName);
    return true;
  } catch (error) {
    console.error('Failed to generate PDF via canvas, falling back to print dialog', error);
    // Graceful fallback to browser print if canvas generation encounters any issue
    window.print();
    return false;
  }
}
