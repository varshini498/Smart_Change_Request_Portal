// middleware/roleMiddleware.js

exports.isEmployee = (req, res, next) => {
  if (req.user.role !== 'Employee') {
    return res.status(403).json({ message: 'Employee access only' });
  }
  next();
};

exports.isManager = (req, res, next) => {
  if (req.user.role !== 'Manager') {
    return res.status(403).json({ message: 'Manager access only' });
  }
  next();
};
