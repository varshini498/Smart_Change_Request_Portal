module.exports.isEmployee = (req, res, next) => {
  if (req.user.role !== 'Employee') return res.status(403).json({ message: 'Forbidden: Employees only' });
  next();
};

module.exports.isManager = (req, res, next) => {
  if (req.user.role !== 'Manager') return res.status(403).json({ message: 'Forbidden: Managers only' });
  next();
};
