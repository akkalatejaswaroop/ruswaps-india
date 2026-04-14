import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { verifyAccessToken } from '@/lib/auth-helpers';
import puppeteer from 'puppeteer';

function sanitizeForPDF(str: string | undefined | null): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[^a-zA-Z0-9\s\/\-_\.]/g, '').slice(0, 100);
}

function formatCurrency(amount: number): string {
  return `Rs.${amount.toLocaleString('en-IN')}`;
}

interface CalculationData {
  inputData: Record<string, unknown>;
  resultData: Record<string, unknown>;
}

async function generateQRCode(verificationId: string): Promise<string> {
  const verificationUrl = `https://ruswaps.in/verify/${verificationId}`;
  try {
    const QRCode = (await import('qrcode')).default;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 120,
      margin: 1,
      color: {
        dark: '#017c43',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (error) {
    logger.error('QR generation error', error);
    return '';
  }
}

function generateMVAPDFHtml(calculationId: string, verificationId: string, qrCodeDataUrl: string, data: CalculationData): string {
  const { inputData, resultData } = data;
  const claimType = String(inputData.claimType || '');
  const claimantType = String(inputData.claimantType || 'married');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MVA Claims Calculator Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #017c43; padding-bottom: 20px; }
    .header h1 { color: #017c43; margin: 0; font-size: 24px; }
    .header p { color: #666; margin: 5px 0; font-size: 12px; }
    .section { margin: 20px 0; }
    .section h2 { color: #017c43; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
    th { background: #f5f5f5; font-weight: bold; }
    .total-row { font-weight: bold; background: #e8f5e9; }
    .footer { margin-top: 40px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; }
    .certificate { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .total-section { margin-top: 30px; }
    .verification-section { background: #e8f5e9; padding: 20px; border-radius: 10px; margin-top: 30px; border: 2px solid #017c43; }
    .verification-section h3 { color: #017c43; margin: 0 0 10px 0; font-size: 14px; }
    .verification-content { display: flex; align-items: center; gap: 20px; }
    .qr-code img { width: 100px; height: 100px; }
    .verification-text { font-size: 11px; color: #666; }
    .verification-text strong { color: #017c43; }
    @page { size: A4; margin: 20mm; }
  </style>
</head>
<body>
  <div class="header">
    <h1>MOTOR VEHICLE ACCIDENT CLAIMS CALCULATOR</h1>
    <p><strong>Certified Calculation Report</strong></p>
    <p>Generated on: ${new Date().toLocaleDateString('en-IN')} | Calculation ID: ${calculationId}</p>
  </div>

  <div class="certificate">
    <strong>Disclaimer:</strong> This is a computer-generated calculation for reference purposes only.
    Actual compensation may vary based on court judgment and specific case circumstances.
  </div>

  <div class="section">
    <h2>Case Information</h2>
    <table>
      <tr><th style="width: 40%;">Case Number</th><td>${sanitizeForPDF(String(inputData.caseNo || '')) || 'N/A'}</td></tr>
      <tr><th>Year</th><td>${String(inputData.caseYear || new Date().getFullYear())}</td></tr>
      <tr><th>Court Name</th><td>${sanitizeForPDF(String(inputData.courtName || '')) || 'N/A'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Claim Information</h2>
    <table>
      <tr><th style="width: 40%;">Claim Type</th><td>${claimType === 'fatal' ? 'Fatal/Death' : 'Non-Fatal/Injury'}</td></tr>
      ${claimType === 'fatal' ? `<tr><th>Claimant Status</th><td>${claimantType.toUpperCase()}</td></tr>` : ''}
      <tr><th>Age of ${claimType === 'fatal' ? 'Deceased' : 'Injured'}</th><td>${Number(inputData.age || 0)} years</td></tr>
      <tr><th>Monthly Income</th><td>${formatCurrency(Number(inputData.monthlyIncome || 0))}</td></tr>
      ${claimType === 'fatal' ? `<tr><th>Number of Dependents</th><td>${Number(inputData.dependents || 0)}</td></tr>` : ''}
      ${claimType !== 'fatal' ? `<tr><th>Disability Percentage</th><td>${Number(inputData.disabilityPercentage || 0)}%</td></tr>` : ''}
      <tr><th>Other Expenses</th><td>${formatCurrency(Number(inputData.otherExpenses || 0))}</td></tr>
    </table>
  </div>

  <div class="section total-section">
    <h2>Calculation Result</h2>
    <table>
      ${claimType === 'fatal' ? `
        <tr><th style="width: 60%;">Loss of Dependency (50%)</th><td>${formatCurrency(Number(resultData.lossOfDependency || 0))}</td></tr>
        <tr><th>Funeral Expenses</th><td>${formatCurrency(Number(resultData.funeralExpenses || 0))}</td></tr>
      ` : `
        <tr><th>Loss of Earning Capacity (60%)</th><td>${formatCurrency(Number(resultData.lossOfEarningCapacity || resultData.lossOfDependency || 0))}</td></tr>
      `}
      <tr><th>Age Factor</th><td>${Number(resultData.ageFactor || 0)}</td></tr>
      <tr><th>Interest Rate</th><td>${Number(resultData.interestRate || 0)}%</td></tr>
      <tr><th>Period (Days)</th><td>${Number(inputData.days || 0)}</td></tr>
      <tr class="total-row"><th>TOTAL COMPENSATION</th><td>${formatCurrency(Number(resultData.totalCompensation || 0))}</td></tr>
      <tr class="total-row"><th>INTEREST AMOUNT</th><td>${formatCurrency(Number(resultData.interestAmount || 0))}</td></tr>
      <tr class="total-row"><th style="background: #017c43; color: white;">GRAND TOTAL (with Interest)</th><td style="background: #017c43; color: white; font-size: 14px;">${formatCurrency(Number(resultData.totalWithInterest || 0))}</td></tr>
    </table>
  </div>

  <div class="verification-section">
    <h3>VERIFICATION QR CODE</h3>
    <div class="verification-content">
      ${qrCodeDataUrl ? `<div class="qr-code"><img src="${qrCodeDataUrl}" alt="Verification QR Code" /></div>` : ''}
      <div class="verification-text">
        <p><strong>Scan to Verify</strong></p>
        <p>Verification ID: <strong>${verificationId}</strong></p>
        <p>Scan this QR code or visit: <strong>ruswaps.in/verify/${verificationId}</strong></p>
        <p>This document can be verified by insurance officials and courts to ensure authenticity.</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p><strong>Generated by Ruswaps - MVA-EC Claims Calculator</strong></p>
    <p>This calculation is based on the Motor Vehicles Act, 1988 and relevant court precedents.</p>
    <p>For official legal advice, please consult a qualified advocate.</p>
    <p style="margin-top: 15px; font-style: italic;">Document generated on ${new Date().toLocaleString('en-IN')}</p>
  </div>
</body>
</html>`;
}

function generateECPDFHtml(calculationId: string, verificationId: string, qrCodeDataUrl: string, data: CalculationData): string {
  const { inputData, resultData } = data;
  const claimType = String(inputData.claimType || '');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Employee Compensation Calculator Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #017c43; padding-bottom: 20px; }
    .header h1 { color: #017c43; margin: 0; font-size: 24px; }
    .header p { color: #666; margin: 5px 0; font-size: 12px; }
    .section { margin: 20px 0; }
    .section h2 { color: #017c43; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
    th { background: #f5f5f5; }
    .total-row { font-weight: bold; background: #e8f5e9; }
    .footer { margin-top: 40px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; }
    .verification-section { background: #e8f5e9; padding: 20px; border-radius: 10px; margin-top: 30px; border: 2px solid #017c43; }
    .verification-section h3 { color: #017c43; margin: 0 0 10px 0; font-size: 14px; }
    .verification-content { display: flex; align-items: center; gap: 20px; }
    .qr-code img { width: 100px; height: 100px; }
    .verification-text { font-size: 11px; color: #666; }
    .verification-text strong { color: #017c43; }
    @page { size: A4; margin: 20mm; }
  </style>
</head>
<body>
  <div class="header">
    <h1>EMPLOYEE/WORKMEN COMPENSATION CLAIMS CALCULATOR</h1>
    <p><strong>Certified Calculation Report</strong></p>
    <p>Generated on: ${new Date().toLocaleDateString('en-IN')} | Calculation ID: ${calculationId}</p>
  </div>

  <div class="section">
    <h2>Case Information</h2>
    <table>
      <tr><th style="width: 40%;">Case Number</th><td>${sanitizeForPDF(String(inputData.caseNo || '')) || 'N/A'}</td></tr>
      <tr><th>Year</th><td>${String(inputData.caseYear || new Date().getFullYear())}</td></tr>
      <tr><th>Court Name</th><td>${sanitizeForPDF(String(inputData.courtName || '')) || 'N/A'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Claim Information</h2>
    <table>
      <tr><th style="width: 40%;">Claim Type</th><td>${claimType === 'fatal' ? 'Fatal/Death' : 'Non-Fatal/Injury'}</td></tr>
      <tr><th>Age</th><td>${Number(inputData.age || 0)} years</td></tr>
      <tr><th>Monthly Wages</th><td>${formatCurrency(Number(inputData.monthlyWages || 0))}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Calculation Result</h2>
    <table>
      <tr><th style="width: 60%;">Loss of ${claimType === 'fatal' ? 'Future Income' : 'Earning Capacity'}</th><td>${formatCurrency(Number(resultData.lossOfFutureIncome || resultData.lossOfEarning || 0))}</td></tr>
      <tr><th>Age Factor</th><td>${Number(resultData.ageFactor || 0)}</td></tr>
      <tr><th>Interest Rate</th><td>${Number(resultData.interestRate || 0)}%</td></tr>
      <tr><th>Period (Days)</th><td>${Number(inputData.days || 0)}</td></tr>
      <tr class="total-row"><th>TOTAL COMPENSATION</th><td>${formatCurrency(Number(resultData.totalCompensation || 0))}</td></tr>
      <tr class="total-row"><th>GRAND TOTAL (with Interest)</th><td style="font-size: 14px;">${formatCurrency(Number(resultData.totalWithInterest || 0))}</td></tr>
    </table>
  </div>

  <div class="verification-section">
    <h3>VERIFICATION QR CODE</h3>
    <div class="verification-content">
      ${qrCodeDataUrl ? `<div class="qr-code"><img src="${qrCodeDataUrl}" alt="Verification QR Code" /></div>` : ''}
      <div class="verification-text">
        <p><strong>Scan to Verify</strong></p>
        <p>Verification ID: <strong>${verificationId}</strong></p>
        <p>Scan this QR code or visit: <strong>ruswaps.in/verify/${verificationId}</strong></p>
        <p>This document can be verified by insurance officials and courts to ensure authenticity.</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p><strong>Generated by Ruswaps - EC Claims Calculator</strong></p>
    <p>Under Workmen Compensation Act, 1923</p>
    <p>Document generated on ${new Date().toLocaleString('en-IN')}</p>
  </div>
</body>
</html>`;
}

function generateIncomeTaxPDFHtml(verificationId: string, qrCodeDataUrl: string, data: CalculationData): string {
  const { inputData, resultData } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Income Tax on Interest Calculator Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #017c43; padding-bottom: 20px; }
    .header h1 { color: #017c43; margin: 0; font-size: 24px; }
    .header p { color: #666; margin: 5px 0; font-size: 12px; }
    .section { margin: 20px 0; }
    .section h2 { color: #017c43; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
    th { background: #f5f5f5; }
    .total-row { font-weight: bold; background: #e8f5e9; }
    .footer { margin-top: 40px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; }
    .verification-section { background: #e8f5e9; padding: 20px; border-radius: 10px; margin-top: 30px; border: 2px solid #017c43; }
    .verification-section h3 { color: #017c43; margin: 0 0 10px 0; font-size: 14px; }
    .verification-content { display: flex; align-items: center; gap: 20px; }
    .qr-code img { width: 100px; height: 100px; }
    .verification-text { font-size: 11px; color: #666; }
    .verification-text strong { color: #017c43; }
    @page { size: A4; margin: 20mm; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INCOME TAX ON INTEREST CALCULATOR</h1>
    <p><strong>Certified Calculation Report</strong></p>
    <p>Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
  </div>

  <div class="section">
    <h2>Input Details</h2>
    <table>
      <tr><th style="width: 40%;">Award Amount</th><td>${formatCurrency(Number(inputData.awardAmount || 0))}</td></tr>
      <tr><th>Interest Rate</th><td>${Number(inputData.interestRate || 0)}%</td></tr>
      <tr><th>Period</th><td>${Number(inputData.days || 0)} days</td></tr>
      <tr><th>PAN Available</th><td>${inputData.hasPAN ? 'Yes' : 'No'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Calculation Result</h2>
    <table>
      <tr><th style="width: 60%;">Gross Interest</th><td>${formatCurrency(Number(resultData.grossInterest || 0))}</td></tr>
      <tr><th>TDS Rate</th><td>${Number(resultData.tdsRate || 0)}%</td></tr>
      <tr><th>TDS Amount</th><td>${formatCurrency(Number(resultData.tdsAmount || 0))}</td></tr>
      <tr class="total-row"><th>NET INTEREST PAYABLE</th><td style="font-size: 14px;">${formatCurrency(Number(resultData.netPayable || 0))}</td></tr>
    </table>
  </div>

  <div class="verification-section">
    <h3>VERIFICATION QR CODE</h3>
    <div class="verification-content">
      ${qrCodeDataUrl ? `<div class="qr-code"><img src="${qrCodeDataUrl}" alt="Verification QR Code" /></div>` : ''}
      <div class="verification-text">
        <p><strong>Scan to Verify</strong></p>
        <p>Verification ID: <strong>${verificationId}</strong></p>
        <p>Scan this QR code or visit: <strong>ruswaps.in/verify/${verificationId}</strong></p>
        <p>This document can be verified by insurance officials and courts to ensure authenticity.</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p><strong>Generated by Ruswaps - Income Tax Calculator</strong></p>
    <p>Under Section 194A of Income Tax Act, 1961</p>
    <p>Document generated on ${new Date().toLocaleString('en-IN')}</p>
  </div>
</body>
</html>`;
}

function generateHitRunPDFHtml(verificationId: string, qrCodeDataUrl: string, data: CalculationData): string {
  const { inputData, resultData } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Hit and Run Compensation Calculator Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #017c43; padding-bottom: 20px; }
    .header h1 { color: #017c43; margin: 0; font-size: 24px; }
    .header p { color: #666; margin: 5px 0; font-size: 12px; }
    .section { margin: 20px 0; }
    .section h2 { color: #017c43; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
    th { background: #f5f5f5; }
    .total-row { font-weight: bold; background: #e8f5e9; }
    .footer { margin-top: 40px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; }
    .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
    .verification-section { background: #e8f5e9; padding: 20px; border-radius: 10px; margin-top: 30px; border: 2px solid #017c43; }
    .verification-section h3 { color: #017c43; margin: 0 0 10px 0; font-size: 14px; }
    .verification-content { display: flex; align-items: center; gap: 20px; }
    .qr-code img { width: 100px; height: 100px; }
    .verification-text { font-size: 11px; color: #666; }
    .verification-text strong { color: #017c43; }
    @page { size: A4; margin: 20mm; }
  </style>
</head>
<body>
  <div class="header">
    <h1>HIT AND RUN COMPENSATION CALCULATOR</h1>
    <p><strong>Special Provision Compensation Report</strong></p>
    <p>Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
  </div>

  <div class="highlight">
    <strong>Legal Provision:</strong> Under the Motor Vehicles Act, 1988 (Amendment 2019), 
    hit and run cases are covered under special compensation provisions.
  </div>

  <div class="section">
    <h2>Case Details</h2>
    <table>
      <tr><th style="width: 40%;">Case Number</th><td>${sanitizeForPDF(String(inputData.caseNo || '')) || 'N/A'}</td></tr>
      <tr><th>Year</th><td>${String(inputData.caseYear || new Date().getFullYear())}</td></tr>
      <tr><th>Number of Deaths</th><td>${Number(inputData.deathCount || 0)}</td></tr>
      <tr><th>Driver Status</th><td>${String(resultData.driverStatus || 'Unknown')}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Compensation Calculation</h2>
    <table>
      <tr><th style="width: 60%;">Compensation per Case</th><td>${formatCurrency(Number(resultData.perCaseAmount || 0))}</td></tr>
      <tr><th>Number of Cases</th><td>${Number(inputData.deathCount || 0)}</td></tr>
      <tr class="total-row"><th>TOTAL COMPENSATION</th><td style="font-size: 16px;">${formatCurrency(Number(resultData.totalCompensation || 0))}</td></tr>
    </table>
  </div>

  <div class="verification-section">
    <h3>VERIFICATION QR CODE</h3>
    <div class="verification-content">
      ${qrCodeDataUrl ? `<div class="qr-code"><img src="${qrCodeDataUrl}" alt="Verification QR Code" /></div>` : ''}
      <div class="verification-text">
        <p><strong>Scan to Verify</strong></p>
        <p>Verification ID: <strong>${verificationId}</strong></p>
        <p>Scan this QR code or visit: <strong>ruswaps.in/verify/${verificationId}</strong></p>
        <p>This document can be verified by insurance officials and courts to ensure authenticity.</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p><strong>Generated by Ruswaps - Hit & Run Calculator</strong></p>
    <p>Under Motor Vehicles Act, Section 161 (as amended)</p>
    <p>Document generated on ${new Date().toLocaleString('en-IN')}</p>
  </div>
</body>
</html>`;
}

function generateDisabilityPDFHtml(verificationId: string, qrCodeDataUrl: string, data: CalculationData): string {
  const { resultData } = data;
  const typeValue = resultData.type;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Disability Calculator Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #017c43; padding-bottom: 20px; }
    .header h1 { color: #017c43; margin: 0; font-size: 24px; }
    .header p { color: #666; margin: 5px 0; font-size: 12px; }
    .section { margin: 20px 0; }
    .section h2 { color: #017c43; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
    th { background: #f5f5f5; }
    .result-box { background: #e8f5e9; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
    .footer { margin-top: 40px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; }
    .verification-section { background: #e8f5e9; padding: 20px; border-radius: 10px; margin-top: 30px; border: 2px solid #017c43; }
    .verification-section h3 { color: #017c43; margin: 0 0 10px 0; font-size: 14px; }
    .verification-content { display: flex; align-items: center; gap: 20px; }
    .qr-code img { width: 100px; height: 100px; }
    .verification-text { font-size: 11px; color: #666; }
    .verification-text strong { color: #017c43; }
    @page { size: A4; margin: 20mm; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DISABILITY CALCULATOR REPORT</h1>
    <p><strong>Assessment Report Based on WHO Guidelines</strong></p>
    <p>Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
  </div>

  <div class="section">
    <h2>Assessment Result</h2>
    <table>
      <tr><th style="width: 40%;">Disability Type</th><td>${typeValue ? String(typeValue).toUpperCase() : 'N/A'}</td></tr>
      <tr><th>Regional Disability</th><td>${Number(resultData.regionalDisability || 0)}%</td></tr>
      <tr><th>Whole Body Disability</th><td>${Number(resultData.wholeBodyDisability || 0)}%</td></tr>
      ${resultData.description ? `<tr><th>Description</th><td>${String(resultData.description)}</td></tr>` : ''}
    </table>
  </div>

  <div class="result-box">
    <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">Whole Body Disability Assessment</p>
    <p style="font-size: 48px; font-weight: bold; color: #017c43; margin: 0;">${Number(resultData.wholeBodyDisability || 0)}%</p>
  </div>

  <div class="verification-section">
    <h3>VERIFICATION QR CODE</h3>
    <div class="verification-content">
      ${qrCodeDataUrl ? `<div class="qr-code"><img src="${qrCodeDataUrl}" alt="Verification QR Code" /></div>` : ''}
      <div class="verification-text">
        <p><strong>Scan to Verify</strong></p>
        <p>Verification ID: <strong>${verificationId}</strong></p>
        <p>Scan this QR code or visit: <strong>ruswaps.in/verify/${verificationId}</strong></p>
        <p>This document can be verified by insurance officials and courts to ensure authenticity.</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p><strong>Generated by Ruswaps - Disability Calculator</strong></p>
    <p>Based on WHO Guidelines for disability assessment</p>
    <p>This assessment is for reference purposes only. Official assessment should be done by authorized medical board.</p>
    <p>Document generated on ${new Date().toLocaleString('en-IN')}</p>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  let browser = null;
  
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }
    const user = authResult.user!;

    const globalRateLimitResult = await checkRateLimit(`pdf:generate`, 'api');
    const globalRateLimitHeaders = getRateLimitHeaders(globalRateLimitResult);

    if (!globalRateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429, headers: globalRateLimitHeaders }
      );
    }

    const userRateLimitResult = await checkRateLimit(`pdf:user:${user.userId}`, 'calculation');
    const userRateLimitHeaders = getRateLimitHeaders(userRateLimitResult);

    if (!userRateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many PDF requests. Please try again later.' },
        { status: 429, headers: userRateLimitHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const calculationId = searchParams.get('id');

    if (!calculationId) {
      return NextResponse.json({ success: false, message: 'Calculation ID is required' }, { status: 400 });
    }

    const calculation = await prisma.calculation.findFirst({
      where: {
        id: calculationId,
        userId: user.userId,
      },
    });

    if (!calculation) {
      return NextResponse.json({ success: false, message: 'Calculation not found' }, { status: 404 });
    }

    let verificationId = calculation.verificationId;
    if (!verificationId) {
      verificationId = `RUS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await prisma.calculation.update({
        where: { id: calculation.id },
        data: { verificationId, isVerified: false },
      });
    }

    const qrCodeDataUrl = await generateQRCode(verificationId);

    const inputData = calculation.inputData as Record<string, unknown>;
    const resultData = calculation.resultData as Record<string, unknown>;
    const calcData: CalculationData = { inputData, resultData };

    let html: string;
    let filename: string;

    switch (calculation.type) {
      case 'mva':
        html = generateMVAPDFHtml(calculation.id, verificationId, qrCodeDataUrl, calcData);
        filename = `MVA_Claims_${calculation.id}.pdf`;
        break;
      case 'ec':
        html = generateECPDFHtml(calculation.id, verificationId, qrCodeDataUrl, calcData);
        filename = `EC_Claims_${calculation.id}.pdf`;
        break;
      case 'income-tax':
        html = generateIncomeTaxPDFHtml(verificationId, qrCodeDataUrl, calcData);
        filename = `Income_Tax_${calculation.id}.pdf`;
        break;
      case 'hit-run':
        html = generateHitRunPDFHtml(verificationId, qrCodeDataUrl, calcData);
        filename = `Hit_Run_${calculation.id}.pdf`;
        break;
      case 'disability':
        html = generateDisabilityPDFHtml(verificationId, qrCodeDataUrl, calcData);
        filename = `Disability_${calculation.id}.pdf`;
        break;
      default:
        return NextResponse.json({ success: false, message: 'Unsupported calculation type' }, { status: 400 });
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });

    await browser.close();
    browser = null;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        ...userRateLimitHeaders,
      },
    });

  } catch (error) {
    logger.error('PDF generation error', error);
    
    if (browser) {
      await browser.close();
    }
    
    return NextResponse.json({ success: false, message: 'Failed to generate PDF' }, { status: 500 });
  }
}
