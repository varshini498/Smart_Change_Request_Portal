const respond = (res, success, dataOrMessage, statusCode = 200) => {
  if (success) {
    return res.status(statusCode).json({ success: true, data: dataOrMessage });
  }
  return res.status(statusCode).json({ success: false, message: dataOrMessage });
};

module.exports = respond;
