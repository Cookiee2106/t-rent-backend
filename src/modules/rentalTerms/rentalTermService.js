const prisma = require("../../utils/prisma");

async function getCurrentTerms() {
  const term = await prisma.rental_terms.findFirst({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      created_at: "desc",
    },
  });

  if (!term) {
    const error = new Error("Không tìm thấy điều khoản thuê hiện hành");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: term.id,
    version: term.version,
    title: "Điều khoản thuê thiết bị",
    content: term.content,
    contentHash: term.content_hash,
    isActive: term.status === "ACTIVE",
  };
}

async function acceptTerms(customerId, termsId, termsVersion) {
  const term = await prisma.rental_terms.findFirst({
    where: {
      id: termsId,
      status: "ACTIVE",
    },
  });

  if (!term) {
    const error = new Error("Điều khoản không tồn tại hoặc đã bị vô hiệu hóa");
    error.statusCode = 404;
    throw error;
  }

  if (term.version !== termsVersion) {
    const error = new Error("Phiên bản điều khoản không đúng");
    error.statusCode = 400;
    throw error;
  }

  const customerProfile = await prisma.customer_profiles.findUnique({
    where: { user_id: customerId },
  });

  if (!customerProfile) {
    const error = new Error("Không tìm thấy hồ sơ khách hàng");
    error.statusCode = 404;
    throw error;
  }

  // LUÔN TẠO MỚI - Không reuse term_acceptance cũ
  const crypto = require("crypto");
  const contentHash = crypto
    .createHash("sha256")
    .update(term.content)
    .digest("hex");

  const acceptance = await prisma.term_acceptances.create({
    data: {
      customer_id: customerProfile.id,
      rental_term_id: termsId,
      snapshot_term_content_hash: contentHash,
    },
  });

  return {
    message: "Đã chấp nhận điều khoản thuê",
    termsAcceptanceId: acceptance.id,
    termsVersion: term.version,
    acceptedAt: acceptance.accepted_at,
  };
}

module.exports = {
  getCurrentTerms,
  acceptTerms,
};
