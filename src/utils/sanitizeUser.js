const sanitizeUser = (user) => {
  const userObject = user.toObject ? user.toObject() : user;
  
  delete userObject.password;
  delete userObject.__v;
  
  return userObject;
};

module.exports = sanitizeUser;
