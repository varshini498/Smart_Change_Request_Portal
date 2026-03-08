const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const analyticsService = require('../services/analyticsService');

const getFilters = (req) => {
  const { from, to, department } = req.query;
  return { from, to, department };
};

const getOverview = (req, res) => {
  const filters = getFilters(req);
  const overview = analyticsService.getOverview(filters);
  const status = analyticsService.getStatusBreakdown(filters);
  return res.json({ overview, status });
};

const getDepartmentStats = (req, res) => {
  const stats = analyticsService.getDepartmentStats(getFilters(req));
  return res.json({ departmentStats: stats });
};

const getApprovalTime = (req, res) => {
  const approvalTime = analyticsService.getApprovalTime(getFilters(req));
  return res.json({ approvalTime });
};

const getOverdueTrends = (req, res) => {
  const trends = analyticsService.getOverdueTrends(getFilters(req));
  return res.json({ overdueTrends: trends });
};

const exportExcel = (req, res) => {
  const filters = getFilters(req);
  const overview = analyticsService.getOverview(filters);
  const status = analyticsService.getStatusBreakdown(filters);
  const departments = analyticsService.getDepartmentStats(filters);
  const overdue = analyticsService.getOverdueTrends(filters);
  const approval = analyticsService.getApprovalTime(filters);

  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ['Metric', 'Value'],
    ['Total Requests', overview.totalRequests || 0],
    ['Pending', overview.pendingCount || 0],
    ['Approved', overview.approvedCount || 0],
    ['Rejected', overview.rejectedCount || 0],
    ['Overdue', overview.overdueCount || 0],
    ['Avg Approval Hours', overview.avgApprovalHours || '0.00'],
  ];

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(status), 'Status');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overview.priorities || []), 'Priority');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(departments), 'Departments');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overdue), 'Overdue');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(approval.byDepartment || []), 'Approval');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=\"analytics_report.xlsx\"');
  return res.send(buffer);
};

const exportPdf = (req, res) => {
  const filters = getFilters(req);
  const overview = analyticsService.getOverview(filters);
  const status = analyticsService.getStatusBreakdown(filters);
  const departments = analyticsService.getDepartmentStats(filters);
  const overdue = analyticsService.getOverdueTrends(filters);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=\"analytics_report.pdf\"');
  doc.pipe(res);

  doc.fontSize(18).text('Smart Change Request Portal - Analytics Report');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#475569').text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();

  doc.fillColor('#0f172a').fontSize(13).text('KPI Summary');
  doc.fontSize(11).text(`Total Requests: ${overview.totalRequests || 0}`);
  doc.text(`Pending: ${overview.pendingCount || 0}`);
  doc.text(`Approved: ${overview.approvedCount || 0}`);
  doc.text(`Rejected: ${overview.rejectedCount || 0}`);
  doc.text(`Overdue: ${overview.overdueCount || 0}`);
  doc.text(`Average Approval Time (Hours): ${overview.avgApprovalHours || '0.00'}`);
  doc.moveDown();

  doc.fontSize(13).text('Status Distribution');
  status.forEach((row) => doc.fontSize(11).text(`- ${row.status}: ${row.count}`));
  doc.moveDown();

  doc.fontSize(13).text('Requests per Department');
  departments.forEach((row) => doc.fontSize(11).text(`- ${row.department}: ${row.count}`));
  doc.moveDown();

  doc.fontSize(13).text('Overdue Trend');
  if (!overdue.length) {
    doc.fontSize(11).text('No overdue requests in selected filter');
  } else {
    overdue.forEach((row) => doc.fontSize(11).text(`- ${row.day}: ${row.count}`));
  }

  doc.end();
};

module.exports = {
  getOverview,
  getDepartmentStats,
  getApprovalTime,
  getOverdueTrends,
  exportExcel,
  exportPdf,
};
