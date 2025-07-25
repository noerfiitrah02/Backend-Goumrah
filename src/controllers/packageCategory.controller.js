const db = require("../models");

const createPackageCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const category = await db.PackageCategory.create({
      name,
    });
    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

const getAllPackageCategories = async (req, res, next) => {
  try {
    const categories = await db.PackageCategory.findAll();
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

const getPackageCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await db.PackageCategory.findByPk(id, {
      include: [
        {
          model: db.Package,
          as: "packages",
          attributes: ["id", "name", "departure_date", "return_date"],
          where: { status: "published" },
          required: false,
        },
      ],
    });
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });
    }
    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

const updatePackageCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const category = await db.PackageCategory.findByPk(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });
    }
    await category.update({ name });
    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

const deletePackageCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await db.PackageCategory.findByPk(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });
    }
    const packagesCount = await db.Package.count({
      where: { category_id: id },
    });
    if (packagesCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak bisa menghapus kategori yang memiliki paket",
      });
    }
    await category.destroy();
    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPackageCategory,
  getAllPackageCategories,
  getPackageCategory,
  updatePackageCategory,
  deletePackageCategory,
};
