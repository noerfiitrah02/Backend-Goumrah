const db = require("../models");
const sequelize = db.sequelize;
const { Op } = require("sequelize");
const fs = require("fs").promises;
const { slugify, makeUniqueSlug } = require("../utils/slugGenerator");

// Fungsi helper untuk membuat unique slug dengan scope kategori
const makeUniqueCategorySlug = async (
  Model,
  categoryId,
  slug,
  excludeId = null
) => {
  let count = 0;
  let newSlug = slug;

  while (true) {
    const whereClause = {
      category_id: categoryId,
      slug: newSlug,
    };

    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    const exists = await Model.findOne({ where: whereClause });

    if (!exists) {
      return newSlug;
    }

    count++;
    newSlug = `${slug}-${count}`;
  }
};

async function getOrCreateTagIds(tagNames) {
  if (typeof tagNames === "string") {
    try {
      tagNames = JSON.parse(tagNames);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(tagNames) || tagNames.length === 0) return [];

  const tags = await Promise.all(
    tagNames.map(async (name) => {
      name = name.trim();
      if (!name) return null;

      try {
        const [tag] = await db.BlogTag.findOrCreate({
          where: { name },
          defaults: {
            name,
            slug: await makeUniqueSlug(db.BlogTag, slugify(name)),
          },
        });
        return tag;
      } catch (error) {
        console.error("Gagal membuat/mendapatkan tag:", name, error);
        return null;
      }
    })
  );

  const tagIds = tags.filter((tag) => tag && tag.id).map((tag) => tag.id);
  return [...new Set(tagIds)];
}

const createBlogCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    const existingCategory = await db.BlogCategory.findOne({
      where: { name },
    });

    if (existingCategory) {
      return res
        .status(400)
        .json({ success: false, message: "Kategori sudah ada" });
    }

    const slug = await makeUniqueSlug(db.BlogCategory, slugify(name));

    const category = await db.BlogCategory.create({ name, slug });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const getAllBlogCategories = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    const categories = await db.BlogCategory.findAll({
      where,
      attributes: [
        "id",
        "name",
        "slug",
        [
          sequelize.literal(`(
            SELECT COUNT(*) 
            FROM BlogPosts 
            WHERE BlogPosts.category_id = BlogCategory.id 
            AND BlogPosts.status = 'published'
          )`),
          "postCount",
        ],
      ],
    });

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

const getBlogCategoryBySlug = async (req, res, next) => {
  try {
    const category = await db.BlogCategory.findOne({
      where: { slug: req.params.categorySlug },
      include: [
        {
          model: db.BlogPost,
          as: "posts",
          attributes: ["id", "title", "slug", "featured_image", "createdAt"],
          where: { status: "published" },
          required: false,
        },
      ],
    });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const updateBlogCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const category = await db.BlogCategory.findOne({
      where: { slug: req.params.categorySlug },
    });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });

    const slug = name
      ? await makeUniqueSlug(db.BlogCategory, slugify(name), category.id)
      : category.slug;
    await category.update({ name, slug });
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const deleteBlogCategory = async (req, res, next) => {
  try {
    const category = await db.BlogCategory.findOne({
      where: { slug: req.params.categorySlug },
    });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });

    const postsCount = await db.BlogPost.count({
      where: { category_id: category.id },
    });
    if (postsCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus kategori yang memiliki postingan",
      });
    }

    await category.destroy();
    res
      .status(200)
      .json({ success: true, message: "Kategori berhasil dihapus" });
  } catch (error) {
    next(error);
  }
};

const createBlogPost = async (req, res, next) => {
  try {
    const { title, content, excerpt, category_id, status, is_featured, tags } =
      req.body;

    // Buat slug yang unique dalam scope kategori
    const baseSlug = slugify(title);
    const slug = await makeUniqueCategorySlug(
      db.BlogPost,
      category_id,
      baseSlug
    );

    const post = await db.BlogPost.create({
      title,
      slug,
      content,
      excerpt,
      category_id,
      author_id: req.user.id,
      status: status || "draft",
      is_featured: is_featured || false,
      published_at: status === "published" ? new Date() : null,
      featured_image: req.file ? req.file.path.replace(/\\/g, "/") : null,
    });

    // Handle tags
    if (tags && tags.length > 0) {
      const tagIds = await getOrCreateTagIds(tags);
      await post.setTags(tagIds);
    }

    // Reload post with associations
    const newPost = await db.BlogPost.findByPk(post.id, {
      include: [
        {
          model: db.BlogCategory,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
        { model: db.User, as: "author", attributes: ["id", "name"] },
        {
          model: db.BlogTag,
          as: "tags",
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
        },
      ],
    });

    res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    next(error);
  }
};

const getAllBlogPosts = async (req, res, next) => {
  try {
    const {
      category_slug,
      status,
      is_featured,
      search,
      author_id,
      tag_slug,
      exclude_category_slug,
      exclude_slug,
    } = req.query;
    const where = {};

    // Exclude berdasarkan kategori dan slug
    if (exclude_category_slug && exclude_slug) {
      const excludeCategory = await db.BlogCategory.findOne({
        where: { slug: exclude_category_slug },
      });
      if (excludeCategory) {
        where[Op.not] = {
          [Op.and]: [
            { category_id: excludeCategory.id },
            { slug: exclude_slug },
          ],
        };
      }
    }

    if (category_slug) {
      const category = await db.BlogCategory.findOne({
        where: { slug: category_slug },
      });
      if (category) where.category_id = category.id;
    }
    if (status) where.status = status;
    if (is_featured) where.is_featured = is_featured === "true";
    if (author_id) where.author_id = author_id;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
      ];
    }

    const include = [
      {
        model: db.BlogCategory,
        as: "category",
        attributes: ["id", "name", "slug"],
      },
      { model: db.User, as: "author", attributes: ["id", "name"] },
      {
        model: db.BlogTag,
        as: "tags",
        attributes: ["id", "name", "slug"],
        through: { attributes: [] },
      },
    ];

    if (tag_slug) {
      const tagInclude = include.find(
        (i) => i.model === db.BlogTag && i.as === "tags"
      );
      if (tagInclude) {
        tagInclude.where = { slug: tag_slug };
        tagInclude.required = true;
      }
    }

    const posts = await db.BlogPost.findAll({
      where,
      include,
      order: [["published_at", "DESC"]],
    });
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

const getFeaturedBlogPosts = async (req, res, next) => {
  try {
    const posts = await db.BlogPost.findAll({
      where: { is_featured: true, status: "published" },
      include: [
        {
          model: db.BlogCategory,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
        { model: db.User, as: "author", attributes: ["id", "name"] },
        {
          model: db.BlogTag,
          as: "tags",
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
        },
      ],
      order: [["published_at", "DESC"]],
    });
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

// Updated: Menggunakan category slug dan post slug
const getBlogPostBySlug = async (req, res, next) => {
  try {
    const { categorySlug, postSlug } = req.params;

    // Cari kategori terlebih dahulu
    const category = await db.BlogCategory.findOne({
      where: { slug: categorySlug },
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });
    }

    // Cari post berdasarkan slug dalam kategori tersebut
    const post = await db.BlogPost.findOne({
      where: {
        slug: postSlug,
        category_id: category.id,
      },
      include: [
        {
          model: db.BlogCategory,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
        { model: db.User, as: "author", attributes: ["id", "name", "email"] },
        {
          model: db.BlogTag,
          as: "tags",
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
        },
      ],
    });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Blog tidak ditemukan" });
    }

    if (post.status === "published") await post.increment("views");
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

const updateBlogPost = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { categorySlug, postSlug } = req.params;
    const { title, content, excerpt, category_id, status, is_featured, tags } =
      req.body;

    // Cari kategori dan post
    const category = await db.BlogCategory.findOne({
      where: { slug: categorySlug },
    });

    if (!category) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });
    }

    const post = await db.BlogPost.findOne({
      where: {
        slug: postSlug,
        category_id: category.id,
      },
    });

    if (!post) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Blog tidak ditemukan" });
    }

    if (post.author_id !== req.user.id && req.user.role !== "admin") {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const updateData = {
      title,
      content,
      excerpt,
      category_id,
      status,
      is_featured,
      published_at:
        status === "published" && post.status !== "published"
          ? new Date()
          : post.published_at,
    };

    // Update slug jika title berubah
    if (title && title !== post.title) {
      const baseSlug = slugify(title);
      const newCategoryId = category_id || post.category_id;
      updateData.slug = await makeUniqueCategorySlug(
        db.BlogPost,
        newCategoryId,
        baseSlug,
        post.id
      );
    }

    if (req.file) {
      if (post.featured_image) {
        try {
          await fs.unlink(post.featured_image.replace(/\\/g, "/"));
        } catch (err) {
          if (err.code !== "ENOENT")
            console.error("Gagal hapus gambar lama:", err);
        }
      }
      updateData.featured_image = req.file.path.replace(/\\/g, "/");
    }

    await post.update(updateData, { transaction });

    if (tags !== undefined) {
      const tagIds = await getOrCreateTagIds(tags);
      await post.setTags(tagIds, { transaction });
    }

    await transaction.commit();

    const updatedPost = await db.BlogPost.findByPk(post.id, {
      include: [
        {
          model: db.BlogCategory,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
        { model: db.User, as: "author", attributes: ["id", "name"] },
        {
          model: db.BlogTag,
          as: "tags",
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
        },
      ],
    });

    res.status(200).json({ success: true, data: updatedPost });
  } catch (error) {
    console.error("Error di updateBlogPost:", error);
    await transaction.rollback();
    next(error);
  }
};

const toggleFeatured = async (req, res, next) => {
  try {
    const { categorySlug, postSlug } = req.params;

    const category = await db.BlogCategory.findOne({
      where: { slug: categorySlug },
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });
    }

    const post = await db.BlogPost.findOne({
      where: {
        slug: postSlug,
        category_id: category.id,
      },
    });

    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Blog tidak ditemukan" });

    if (post.author_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    if (post.status !== "published") {
      return res
        .status(400)
        .json({ success: false, message: "Blog belum terpublikasi" });
    }

    await post.update({ is_featured: !post.is_featured });
    res.status(200).json({
      success: true,
      message: `Post ${
        post.is_featured ? "ditambahkan ke" : "dihapus dari"
      } featured`,
      data: { is_featured: post.is_featured },
    });
  } catch (error) {
    next(error);
  }
};

const deleteBlogPost = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { categorySlug, postSlug } = req.params;

    const category = await db.BlogCategory.findOne({
      where: { slug: categorySlug },
    });

    if (!category) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Kategori tidak ditemukan" });
    }

    const post = await db.BlogPost.findOne({
      where: {
        slug: postSlug,
        category_id: category.id,
      },
      transaction,
    });

    if (!post) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Postingan tidak ditemukan" });
    }

    if (post.author_id !== req.user.id && req.user.role !== "admin") {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const imagePathToDelete = post.featured_image;

    await post.destroy({ transaction });
    await transaction.commit();

    if (imagePathToDelete) {
      try {
        await fs.unlink(imagePathToDelete.replace(/\\/g, "/"));
      } catch (err) {
        if (err.code !== "ENOENT")
          console.error("Gagal menghapus gambar:", err);
      }
    }

    res
      .status(200)
      .json({ success: true, message: "Postingan berhasil dihapus" });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Tag Controllers (tidak berubah)
const createBlogTag = async (req, res, next) => {
  try {
    const { name } = req.body;

    // cek apakah tag sudah ada
    const existingTag = await db.BlogTag.findOne({ where: { name } });
    if (existingTag) {
      return res.status(400).json({ success: false, message: "Tag sudah ada" });
    }

    const slug = await makeUniqueSlug(db.BlogTag, slugify(name));

    const tag = await db.BlogTag.create({ name, slug });
    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    next(error);
  }
};

const getAllBlogTags = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    const tags = await db.BlogTag.findAll({
      where,
      include: [
        {
          model: db.BlogPost,
          as: "posts",
          attributes: [],
          through: { attributes: [] },
        },
      ],
      attributes: [
        "id",
        "name",
        "slug",
        [sequelize.fn("COUNT", sequelize.col("posts.id")), "postCount"],
      ],
      group: ["BlogTag.id"],
      order: [[sequelize.literal("postCount"), "DESC"]],
    });
    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    console.error("Error di getAllBlogTags:", error);
    next(error);
  }
};

const getBlogTagBySlug = async (req, res, next) => {
  try {
    const tag = await db.BlogTag.findOne({
      where: { slug: req.params.slug },
      include: [
        {
          model: db.BlogPost,
          as: "posts",
          attributes: ["id", "title", "slug", "featured_image", "createdAt"],
          where: { status: "published" },
          required: false,
          include: [
            {
              model: db.BlogCategory,
              as: "category",
              attributes: ["slug"],
            },
          ],
        },
      ],
    });
    if (!tag)
      return res
        .status(404)
        .json({ success: false, message: "Tag tidak ditemukan" });
    res.status(200).json({ success: true, data: tag });
  } catch (error) {
    next(error);
  }
};

const updateBlogTag = async (req, res, next) => {
  try {
    const { name } = req.body;
    const tag = await db.BlogTag.findOne({
      where: { slug: req.params.slug },
    });
    if (!tag)
      return res
        .status(404)
        .json({ success: false, message: "Tag tidak ditemukan" });

    const slug = name
      ? await makeUniqueSlug(db.BlogTag, slugify(name))
      : tag.slug;
    await tag.update({ name, slug });
    res.status(200).json({ success: true, data: tag });
  } catch (error) {
    next(error);
  }
};

const deleteBlogTag = async (req, res, next) => {
  try {
    const tag = await db.BlogTag.findOne({
      where: { slug: req.params.slug },
    });
    if (!tag)
      return res
        .status(404)
        .json({ success: false, message: "Tag tidak ditemukan" });

    await tag.destroy();
    res.status(200).json({ success: true, message: "Tag berhasil dihapus" });
  } catch (error) {
    next(error);
  }
};

const getBlogPostsByTag = async (req, res, next) => {
  try {
    const posts = await db.BlogPost.findAll({
      include: [
        {
          model: db.BlogTag,
          as: "tags",
          where: { slug: req.params.slug },
          attributes: [],
          through: { attributes: [] },
        },
        {
          model: db.BlogCategory,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
        { model: db.User, as: "author", attributes: ["id", "name"] },
      ],
      where: { status: "published" },
      order: [["published_at", "DESC"]],
    });
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

const getPopularTags = async (req, res, next) => {
  try {
    const tags = await db.BlogTag.findAll({
      include: [
        {
          model: db.BlogPost,
          as: "posts",
          attributes: [],
          where: { status: "published" },
        },
      ],
      attributes: [
        "id",
        "name",
        "slug",
        [sequelize.fn("COUNT", sequelize.col("posts.id")), "postCount"],
      ],
      group: ["BlogTag.id"],
      order: [[sequelize.literal("postCount"), "DESC"]],
      limit: 10,
    });
    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBlogCategory,
  getAllBlogCategories,
  getBlogCategoryBySlug,
  updateBlogCategory,
  deleteBlogCategory,
  createBlogPost,
  getAllBlogPosts,
  getFeaturedBlogPosts,
  getBlogPostBySlug,
  updateBlogPost,
  toggleFeatured,
  deleteBlogPost,
  createBlogTag,
  getAllBlogTags,
  getBlogTagBySlug,
  updateBlogTag,
  deleteBlogTag,
  getBlogPostsByTag,
  getPopularTags,
};
