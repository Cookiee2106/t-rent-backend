const prisma = require("../../utils/prisma");

async function getCustomerAccounts({ page = 1, limit = 20, keyword, verificationStatus }) {
  const skip = (page - 1) * limit;

  const where = {
    role: "CUSTOMER",
    deleted_at: null,
  };

  if (keyword) {
    where.OR = [
      { full_name: { contains: keyword, mode: "insensitive" } },
      { email: { contains: keyword, mode: "insensitive" } },
      { phone: { contains: keyword, mode: "insensitive" } },
    ];
  }

  if (verificationStatus) {
    where.customer_profiles = {
      verification_status: verificationStatus,
    };
  }

  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { created_at: "desc" },
      include: {
        customer_profiles: {
          include: {
            customer_verifications: {
              orderBy: { created_at: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.users.count({ where }),
  ]);

  return {
    users: users.map((user) => {
      const profile = user.customer_profiles;
      const latestVerification =
        profile?.customer_verifications?.[0] ?? null;

      return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        createdAt: user.created_at,
        profile: profile
          ? {
              id: profile.id,
              address: profile.address,
              identityNumber: profile.identity_number,
              verificationStatus: profile.verification_status,
              latestVerification: latestVerification
                ? {
                    id: latestVerification.id,
                    identityNumber: latestVerification.identity_number,
                    frontImageUrl: latestVerification.front_image_url,
                    backImageUrl: latestVerification.back_image_url,
                    status: latestVerification.status,
                    rejectReason: latestVerification.reject_reason,
                    reviewedAt: latestVerification.reviewed_at,
                    createdAt: latestVerification.created_at,
                  }
                : null,
            }
          : null,
      };
    }),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getCustomerAccountDetail(userId) {
  const user = await prisma.users.findFirst({
    where: {
      id: userId,
      role: "CUSTOMER",
      deleted_at: null,
    },
    include: {
      customer_profiles: {
        include: {
          customer_verifications: {
            orderBy: { created_at: "desc" },
          },
        },
      },
    },
  });

  if (!user) {
    const error = new Error("Không tìm thấy tài khoản khách hàng");
    error.statusCode = 404;
    throw error;
  }

  const profile = user.customer_profiles;

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    createdAt: user.created_at,
    profile: profile
      ? {
          id: profile.id,
          address: profile.address,
          identityNumber: profile.identity_number,
          verificationStatus: profile.verification_status,
          verifications: profile.customer_verifications.map((v) => ({
            id: v.id,
            identityNumber: v.identity_number,
            frontImageUrl: v.front_image_url,
            backImageUrl: v.back_image_url,
            status: v.status,
            rejectReason: v.reject_reason,
            reviewedAt: v.reviewed_at,
            createdAt: v.created_at,
          })),
        }
      : null,
  };
}

async function approveVerification(userId, adminId) {
  const profile = await prisma.customer_profiles.findFirst({
    where: {
      user_id: userId,
      verification_status: "PENDING",
    },
    include: {
      customer_verifications: {
        where: { status: "PENDING" },
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
  });

  if (!profile) {
    const error = new Error("Không tìm thấy hồ sơ xác minh đang chờ duyệt");
    error.statusCode = 404;
    throw error;
  }

  const verification = profile.customer_verifications[0];
  if (!verification) {
    const error = new Error("Không tìm thấy hồ sơ xác minh đang chờ duyệt");
    error.statusCode = 404;
    throw error;
  }

  await prisma.$transaction([
    prisma.customer_verifications.update({
      where: { id: verification.id },
      data: {
        status: "APPROVED",
        reviewed_by: adminId,
        reviewed_at: new Date(),
      },
    }),
    prisma.customer_profiles.update({
      where: { id: profile.id },
      data: { verification_status: "APPROVED" },
    }),
  ]);

  return {
    message: "Duyệt hồ sơ xác minh thành công",
    verificationStatus: "APPROVED",
  };
}

async function rejectVerification(userId, adminId, rejectReason) {
  const profile = await prisma.customer_profiles.findFirst({
    where: {
      user_id: userId,
      verification_status: "PENDING",
    },
    include: {
      customer_verifications: {
        where: { status: "PENDING" },
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
  });

  if (!profile) {
    const error = new Error("Không tìm thấy hồ sơ xác minh đang chờ duyệt");
    error.statusCode = 404;
    throw error;
  }

  const verification = profile.customer_verifications[0];
  if (!verification) {
    const error = new Error("Không tìm thấy hồ sơ xác minh đang chờ duyệt");
    error.statusCode = 404;
    throw error;
  }

  if (!rejectReason) {
    const error = new Error("Vui lòng nhập lý do từ chối");
    error.statusCode = 400;
    throw error;
  }

  await prisma.$transaction([
    prisma.customer_verifications.update({
      where: { id: verification.id },
      data: {
        status: "REJECTED",
        reject_reason: rejectReason,
        reviewed_by: adminId,
        reviewed_at: new Date(),
      },
    }),
    prisma.customer_profiles.update({
      where: { id: profile.id },
      data: { verification_status: "REJECTED" },
    }),
  ]);

  return {
    message: "Từ chối hồ sơ xác minh thành công",
    verificationStatus: "REJECTED",
  };
}

module.exports = {
  getCustomerAccounts,
  getCustomerAccountDetail,
  approveVerification,
  rejectVerification,
};
