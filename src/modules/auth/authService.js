const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../../utils/prisma");

async function register({ fullName, email, phone, password }) {
  const existingUser = await prisma.users.findUnique({ where: { email } });
  if (existingUser) {
    const error = new Error("Email đã được sử dụng");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.users.create({
    data: {
      full_name: fullName,
      email,
      phone,
      password_hash: passwordHash,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });

  await prisma.customer_profiles.create({
    data: {
      user_id: user.id,
      verification_status: "NOT_VERIFIED",
    },
  });

  return user;
}

async function login({ email, password }) {
  const user = await prisma.users.findUnique({
    where: { email },
    include: {
      customer_profiles: true,
    },
  });

  if (!user) {
    const error = new Error("Email hoặc mật khẩu không đúng");
    error.statusCode = 401;
    throw error;
  }

  if (user.deleted_at) {
    const error = new Error("Tài khoản đã bị vô hiệu hóa");
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    const error = new Error("Email hoặc mật khẩu không đúng");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return {
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
    token,
  };
}

module.exports = {
  register,
  login,
};
