const db = require("../models");
const { Op } = require("sequelize");

const createOrder = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  try {
    // Ambil data pesanan dari body request
    const { package_id, room_type, jamaah_details } = req.body;
    // Cari paket dan pastikan statusnya 'published'
    const package = await db.Package.findByPk(package_id);
    if (!package || package.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "Paket tidak tersedia untuk dipesan",
      });
    }

    // Tentukan harga per orang berdasarkan tipe kamar yang dipilih
    let pricePerPerson;
    switch (room_type) {
      case "double":
        pricePerPerson = package.price_double;
        break;
      case "triple":
        pricePerPerson = package.price_tripple;
        break;
      case "quadruple":
        pricePerPerson = package.price_quadraple;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid room type",
        });
    }
    // Validasi bahwa detail jamaah adalah array dan tidak kosong
    if (!Array.isArray(jamaah_details) || jamaah_details.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one jamaah detail is required",
      });
    }
    // Cek apakah kuota paket masih mencukupi
    if (package.remaining_quota < jamaah_details.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Kuota paket tidak mencukupi",
      });
    }
    // Hitung total harga pesanan
    const totalPrice = pricePerPerson * jamaah_details.length;
    // Buat record pesanan (Order) baru
    const order = await db.Order.create(
      {
        user_id: req.user.id,
        package_id,
        room_type,
        total_price: totalPrice,
        order_status: "pending",
      },
      { transaction }
    );

    // Buat record detail pesanan (OrderDetail) untuk setiap jamaah
    const orderDetails = await Promise.all(
      jamaah_details.map((detail) =>
        db.OrderDetail.create(
          {
            order_id: order.id,
            name: detail.name,
            birth_date: detail.birth_date,
            birth_place: detail.birth_place,
            nik: detail.nik,
            gender: detail.gender,
            job: detail.job,
            city: detail.city,
            address: detail.address,
            postal_code: detail.postal_code,
            emergency_contact_name: detail.emergency_contact_name,
            emergency_contact_phone: detail.emergency_contact_phone,
            emergency_contact_relationship:
              detail.emergency_contact_relationship,
          },
          { transaction }
        )
      )
    );
    // Kurangi kuota paket yang tersisa
    await package.decrement("remaining_quota", {
      by: jamaah_details.length,
      transaction,
    });
    // Jika semua berhasil, commit transaksi
    await transaction.commit();
    res.status(201).json({
      success: true,
      data: { order, orderDetails },
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    // Ambil parameter query untuk filtering
    const {
      user_id,
      package_id,
      order_status,
      from_date,
      to_date,
      search,
      show_only_mine,
    } = req.query;

    const where = {};

    // Filter untuk travel agent agar hanya melihat pesanan dari paket miliknya
    if (show_only_mine === "true") {
      where["$package.created_by$"] = req.user.id;
    }

    // Bangun klausa 'where' secara dinamis berdasarkan filter lainnya
    if (user_id) where.user_id = user_id;
    if (package_id) where.package_id = package_id;
    if (order_status) where.order_status = order_status;

    if (from_date || to_date) {
      where.createdAt = {};
      if (from_date) where.createdAt[Op.gte] = new Date(from_date);
      if (to_date) where.createdAt[Op.lte] = new Date(to_date);
    }

    if (search) {
      where[Op.or] = [
        { "$user.name$": { [Op.like]: `%${search}%` } },
        { "$package.name$": { [Op.like]: `%${search}%` } },
      ];
    }

    // Ambil semua pesanan dari database sesuai filter
    const orders = await db.Order.findAll({
      where,
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: db.Package,
          as: "package",
          attributes: ["id", "name", "departure_date", "created_by"],
          required: show_only_mine === "true",
        },
        {
          model: db.OrderDetail,
          as: "details",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Cari pesanan berdasarkan ID dan semua relasi detailnya
    const order = await db.Order.findByPk(id, {
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "email", "phone_number"],
        },
        {
          model: db.Package,
          as: "package",
          include: [
            {
              model: db.PackageCategory,
              as: "category",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: db.OrderDetail,
          as: "details",
        },
      ],
    });

    // Jika pesanan tidak ditemukan, kirim error 404
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan" });
    }

    // Cek otorisasi: hanya admin/travel agent yang bisa melihat detail pesanan ini
    if (req.user.role === "user") {
      return res.status(403).json({
        success: false,
        message: "Tidak diperbolehkan mengakses order ini",
      });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { order_status } = req.body;
    // Validasi nilai status yang diperbolehkan
    if (!["pending", "paid", "cancelled", "failed"].includes(order_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }
    // Cari pesanan yang akan di-update
    const order = await db.Order.findByPk(id, { transaction });
    if (!order) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    // Jika status diubah menjadi 'cancelled', kembalikan kuota paket
    if (order_status === "cancelled" && order.order_status !== "cancelled") {
      const package = await db.Package.findByPk(order.package_id, {
        transaction,
      });
      if (package) {
        const detailsCount = await db.OrderDetail.count({
          where: { order_id: order.id },
          transaction,
        });
        await package.increment("remaining_quota", {
          by: detailsCount,
          transaction,
        });
      }
    }
    // Lakukan update status dan commit transaksi
    await order.update({ order_status }, { transaction });
    await transaction.commit();
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const deleteOrder = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    // Cari pesanan yang akan dihapus
    const order = await db.Order.findByPk(id, { transaction });
    if (!order) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    // Cek otorisasi: hanya pembuat pesanan atau admin yang bisa menghapus
    if (order.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this order",
      });
    }
    // Jika pesanan yang dihapus belum dibatalkan, kembalikan kuota paket
    if (order.order_status !== "cancelled") {
      const package = await db.Package.findByPk(order.package_id, {
        transaction,
      });
      if (package) {
        const detailsCount = await db.OrderDetail.count({
          where: { order_id: order.id },
          transaction,
        });
        await package.increment("remaining_quota", {
          by: detailsCount,
          transaction,
        });
      }
    }
    // Hapus semua detail pesanan terkait
    await db.OrderDetail.destroy({
      where: { order_id: id },
      transaction,
    });
    // Hapus pesanan utama dan commit transaksi
    await order.destroy({ transaction });
    await transaction.commit();
    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getUserOrders = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { order_status } = req.query;

    const where = { user_id: id };

    if (order_status) {
      where.order_status = order_status;
    }

    const orders = await db.Order.findAll({
      where,
      include: [
        {
          model: db.Package,
          as: "package",
          attributes: [
            "id",
            "name",
            "departure_date",
            "return_date",
            "duration",
            "featured_image",
            "createdAt",
          ],
          include: [
            {
              model: db.PackageCategory,
              as: "category",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: db.OrderDetail,
          as: "details",
          attributes: ["id", "name"],
          limit: 1,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  createOrder,
  getAllOrders,
  getOrder,
  updateOrderStatus,
  deleteOrder,
  getUserOrders,
};
