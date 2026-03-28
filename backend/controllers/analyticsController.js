const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const analyticsService = require('../services/analyticsService');

const getFilters = (req) => {
  const { from, to, category } = req.query;
  return {
    role: req.user.role,
    userId: req.user.id,
    from,
    to,
    category,
  };
};

const getEmployee = (req, res) => {
  const payload = analyticsService.getEmployeeAnalytics(getFilters(req));
  payload.categoryData = payload.byCategory;
  return res.json({ success: true, data: payload });
};

const getOverview = (req, res) => {
  const filters = getFilters(req);
  const payload = analyticsService.getOverview(filters);
  payload.categoryData = payload.byCategory;
  return res.json({
    success: true,
    data: payload,
    overview: payload,
    status: payload.statusBreakdown,
  });
};

const getDepartmentStats = (req, res) => {
  const filter = analyticsService.buildFilters(getFilters(req));
  const stats = analyticsService.getDepartmentStats(filter);
  return res.json({ success: true, data: stats, departmentStats: stats });
};

const getApprovalTime = (req, res) => {
  const filter = analyticsService.buildFilters(getFilters(req));
  const approvalTime = analyticsService.getApprovalTime(filter);
  return res.json({ success: true, data: approvalTime, approvalTime });
};

const getOverdueTrends = (req, res) => {
  const filter = analyticsService.buildFilters(getFilters(req));
  const trends = analyticsService.getOverdueTrends(filter);
  return res.json({ success: true, data: trends, overdueTrends: trends });
};

const exportExcel = (req, res) => {
  const filters = getFilters(req);
  const overview = analyticsService.getOverview(filters);
  const departmentStats = analyticsService.getDepartmentStats(analyticsService.buildFilters(filters));
  const overdueTrends = analyticsService.getOverdueTrends(analyticsService.buildFilters(filters));
  const approvalTime = analyticsService.getApprovalTime(analyticsService.buildFilters(filters));

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      {
        totalRequests: overview.totalRequests,
        approved: overview.approved,
        rejected: overview.rejected,
        pending: overview.pending,
        draft: overview.draft,
      },
    ]),
    'KPI'
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overview.statusBreakdown), 'Status');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overview.byCategory), 'Category');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overview.monthlyTrend), 'Monthly');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(departmentStats), 'Departments');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overdueTrends), 'Overdue');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(approvalTime.byDepartment), 'ApprovalTime');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="analytics_report.xlsx"');
  return res.send(buffer);
};

const exportPdf = (req, res) => {
  const filters = getFilters(req);
  const overview = analyticsService.getOverview(filters);
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="analytics_report.pdf"');
  doc.pipe(res);

  doc.fontSize(18).text('Smart Change Request Portal - Analytics Report');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#475569').text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();

  doc.fillColor('#0f172a').fontSize(13).text('KPI Summary');
  doc.fontSize(11).text(`Total Requests: ${overview.totalRequests}`);
  doc.text(`Approved: ${overview.approved}`);
  doc.text(`Rejected: ${overview.rejected}`);
  doc.text(`Pending: ${overview.pending}`);
  doc.text(`Draft: ${overview.draft}`);
  doc.moveDown();

  doc.fontSize(13).text('Requests by Status');
  overview.statusBreakdown.forEach((row) => {
    doc.fontSize(11).text(`- ${row.status}: ${row.count}`);
  });

  doc.moveDown();
  doc.fontSize(13).text('Requests by Category');
  overview.byCategory.forEach((row) => {
    doc.fontSize(11).text(`- ${row.category}: ${row.count}`);
  });

  doc.end();
};

module.exports = {
  getEmployee,
  getOverview,
  getDepartmentStats,
  getApprovalTime,
  getOverdueTrends,
  exportExcel,
  exportPdf,
};
