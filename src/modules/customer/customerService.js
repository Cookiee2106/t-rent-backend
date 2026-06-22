const prisma = require("../../utils/prisma");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

async function getCustomerAccount(userId) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
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
    const error = new Error("Không tìm thấy tài khoản");
    error.statusCode = 404;
    throw error;
  }

  const profile = user.customer_profiles;

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    profile: profile
      ? {
          id: profile.id,
          address: profile.address,
          identityNumber: profile.identity_number,
          verificationStatus: profile.verification_status,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          latestVerification:
            profile.customer_verifications.length > 0
              ? {
                  id: profile.customer_verifications[0].id,
                  identityNumber: profile.customer_verifications[0].identity_number,
                  status: profile.customer_verifications[0].status,
                  rejectReason: profile.customer_verifications[0].reject_reason,
                  createdAt: profile.customer_verifications[0].created_at,
                }
              : null,
        }
      : null,
  };
}

async function updateCustomerProfile(userId, data) {
  const profile = await prisma.customer_profiles.findUnique({
    where: { user_id: userId },
  });

  if (!profile) {
    const error = new Error("Không tìm thấy hồ sơ khách hàng");
    error.statusCode = 404;
    throw error;
  }

  if (data.identityNumber && data.identityNumber !== profile.identity_number) {
    const existingIdentity = await prisma.customer_profiles.findFirst({
      where: {
        identity_number: data.identityNumber,
        id: { not: profile.id },
      },
    });
    if (existingIdentity) {
      const error = new Error("Số định danh đã được sử dụng");
      error.statusCode = 409;
      throw error;
    }
  }

  const updated = await prisma.customer_profiles.update({
    where: { user_id: userId },
    data: {
      address: data.address !== undefined ? data.address : profile.address,
      identity_number:
        data.identityNumber !== undefined ? data.identityNumber : profile.identity_number,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    address: updated.address,
    identityNumber: updated.identity_number,
    verificationStatus: updated.verification_status,
  };
}

async function submitVerification(userId, files, identityNumber) {
  const profile = await prisma.customer_profiles.findUnique({
    where: { user_id: userId },
  });

  if (!profile) {
    const error = new Error("Không tìm thấy hồ sơ khách hàng");
    error.statusCode = 404;
    throw error;
  }

  if (profile.verification_status === "PENDING") {
    const error = new Error("Hồ sơ xác minh đang được xử lý, vui lòng chờ duyệt");
    error.statusCode = 400;
    throw error;
  }

  if (profile.verification_status === "APPROVED") {
    const error = new Error("Tài khoản đã được xác minh");
    error.statusCode = 400;
    throw error;
  }

  if (!files || !files.frontImage || !files.backImage) {
    const error = new Error("Vui lòng upload đầy đủ ảnh mặt trước và mặt sau CCCD");
    error.statusCode = 400;
    throw error;
  }

  const frontUpload = await uploadBufferToCloudinary(
    files.frontImage[0].buffer,
    "t-rent/verifications",
    "image"
  );
  const backUpload = await uploadBufferToCloudinary(
    files.backImage[0].buffer,
    "t-rent/verifications",
    "image"
  );

  const verification = await prisma.customer_verifications.create({
    data: {
      customer_id: profile.id,
      identity_number: identityNumber || profile.identity_number || "",
      front_image_url: frontUpload.secure_url,
      back_image_url: backUpload.secure_url,
      status: "PENDING",
    },
  });

  await prisma.customer_profiles.update({
    where: { id: profile.id },
    data: {
      verification_status: "PENDING",
      identity_number: identityNumber || profile.identity_number,
    },
  });

  return {
    id: verification.id,
    status: verification.status,
    frontImageUrl: verification.front_image_url,
    backImageUrl: verification.back_image_url,
    createdAt: verification.created_at,
  };
}

module.exports = {
  getCustomerAccount,
  updateCustomerProfile,
  submitVerification,
};
