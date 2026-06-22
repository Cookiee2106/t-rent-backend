
const prisma = require("../../utils/prisma");

async function getProductModels({
  page = 1,
  limit = 20,
  keyword,
  category,
  brand,
}) {
  const skip = (page - 1) * limit;

  const where = {
    status: "ACTIVE",
    deleted_at: null,
  };

  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.categories = {
      name: { equals: category, mode: "insensitive" },
    };
  }

  if (brand) {
    where.brands = {
      name: { equals: brand, mode: "insensitive" },
    };
  }

  const [productModels, total] = await Promise.all([
    prisma.product_models.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { created_at: "desc" },
      include: {
        brands: {
          select: {
            id: true,
            name: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.product_models.count({ where }),
  ]);

  return {
    productModels: productModels.map((pm) => ({
      id: pm.id,
      name: pm.name,
      description: pm.description,
      imageUrl: pm.image_url,
      dailyPrice: pm.daily_price,
      depositAmount: pm.deposit_amount,
      status: pm.status,
      brand: pm.brands,
      category: pm.categories,
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getProductModelDetail(id) {
  const productModel = await prisma.product_models.findUnique({
    where: {
      id,
      status: "ACTIVE",
      deleted_at: null,
    },
    include: {
      brands: {
        select: {
          id: true,
          name: true,
        },
      },
      categories: {
        select: {
          id: true,
          name: true,
        },
      },
      included_items_included_items_product_model_idToproduct_models: {
        where: { deleted_at: null },
        select: {
          id: true,
          item_name: true,
          quantity: true,
          management_type: true,
          required: true,
          note: true,
        },
      },
    },
  });

  if (!productModel) {
    const error = new Error("Không tìm thấy mẫu thiết bị");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: productModel.id,
    name: productModel.name,
    description: productModel.description,
    imageUrl: productModel.image_url,
    dailyPrice: productModel.daily_price,
    depositAmount: productModel.deposit_amount,
    status: productModel.status,
    brand: productModel.brands,
    category: productModel.categories,
    includedItems: productModel.included_items_included_items_product_model_idToproduct_models.map((item) => ({
      id: item.id,
      itemName: item.item_name,
      quantity: item.quantity,
      managementType: item.management_type,
      required: item.required,
      note: item.note,
    })),
  };
}

module.exports = {
  getProductModels,
  getProductModelDetail,
};
