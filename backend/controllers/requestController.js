const createRequest = async (req, res) => {
  try {
    res.status(201).json({ message: "Request created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createRequest };
