const db = require("../models");
const sequelize = require("sequelize");
const { Op } = require("sequelize");

const dashboardAdmin = async (req, res, next) => {
  try {
    // Hitung statistik total untuk berbagai entitas
    const totalPackages = await db.Package.count();
    const totalOrders = await db.Order.count();
    const totalRevenue =
      (await db.Order.sum("total_price", {
        where: { order_status: "paid" },
      })) || 0;
    const totalUsers = await db.User.count();
    const totalBlogPosts = await db.BlogPost.count();
    const totalAirlines = await db.Airline.count();
    const totalBanks = await db.Bank.count();
    const totalTravelAgents = await db.TravelAgent.count();

    // Hitung jumlah pesanan berdasarkan statusnya
    const orderStatus = {
      paid: await db.Order.count({ where: { order_status: "paid" } }),
      pending: await db.Order.count({ where: { order_status: "pending" } }),
      cancelled: await db.Order.count({
        where: { order_status: "cancelled" },
      }),
    };

    // 1. Data pendapatan agregat per tahun (untuk dropdown filter tahun)
    const yearlyRevenue = await db.Order.findAll({
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("Order.createdAt"), "%Y"),
          "year",
        ],
        [sequelize.fn("SUM", sequelize.col("total_price")), "total"],
      ],
      where: { order_status: "paid" },
      group: ["year"],
      order: [["year", "DESC"]],
      raw: true,
    });

    // 2. Ambil parameter tahun dari query (default: tahun berjalan)
    const selectedYear = req.query.year || new Date().getFullYear();

    // 3. Data pendapatan per bulan untuk tahun yang dipilih
    const monthlyRevenue = await db.Order.findAll({
      attributes: [
        [
          sequelize.fn(
            "DATE_FORMAT",
            sequelize.col("Order.createdAt"),
            "%Y-%m"
          ),
          "month",
        ],
        [sequelize.fn("SUM", sequelize.col("total_price")), "total"],
      ],
      where: {
        order_status: "paid",
        createdAt: {
          [Op.gte]: new Date(`${selectedYear}-01-01`),
          [Op.lt]: new Date(`${parseInt(selectedYear) + 1}-01-01`),
        },
      },
      group: ["month"],
      order: [["month", "ASC"]],
      raw: true,
    });

    // Format data bulanan untuk memastikan semua bulan ada (termasuk yang 0)
    const allMonths = Array.from({ length: 12 }, (_, i) => {
      const month = (i + 1).toString().padStart(2, "0");
      return `${selectedYear}-${month}`;
    });

    const formattedMonthlyRevenue = allMonths.map((month) => {
      const found = monthlyRevenue.find((item) => item.month === month);
      return {
        month,
        total: found ? parseFloat(found.total) : 0,
      };
    });

    // Ambil 5 pesanan terbaru milik admin
    const recentOrders = await db.Order.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.Package,
          as: "package",
          attributes: ["name"],
        },
        { model: db.User, as: "user", attributes: ["name"] },
      ],
    });

    // Ambil 5 paket terpopuler berdasarkan jumlah pesanan
    const popularPackages = await db.Package.findAll({
      attributes: {
        include: [
          [sequelize.fn("COUNT", sequelize.col("orders.id")), "order_count"],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                `CASE WHEN \`orders\`.\`order_status\` = 'paid' THEN \`orders\`.\`total_price\` ELSE 0 END`
              )
            ),
            "total_revenue",
          ],
        ],
      },
      include: [
        {
          model: db.Order,
          as: "orders",
          attributes: [],
          required: false, // LEFT JOIN untuk menyertakan paket tanpa pesanan
        },
      ],
      group: ["Package.id"],
      order: [[db.sequelize.literal("order_count"), "DESC"]],
      limit: 5,
      subQuery: false, // Diperlukan agar `limit` bekerja dengan benar pada query agregasi
    });

    // Kirim semua data yang telah dikumpulkan sebagai respons
    res.json({
      success: true,
      data: {
        totalPackages,
        totalOrders,
        totalRevenue,
        totalUsers,
        totalBlogPosts,
        totalAirlines,
        totalBanks,
        totalTravelAgents,
        orderStatus,
        yearlyRevenue,
        monthlyRevenue: formattedMonthlyRevenue,
        selectedYear: parseInt(selectedYear),
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          package_name: order.package?.name,
          user_name: order.user?.name,
          total_price: order.total_price,
          order_status: order.order_status,
          createdAt: order.createdAt,
        })),
        popularPackages: popularPackages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          price: pkg.price_double,
          order_count: parseInt(pkg.get("order_count") || 0, 10),
          total_revenue: parseFloat(pkg.get("total_revenue") || 0),
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat data dashboard",
      error: error.message,
    });
  }
};

const dashboardTravelAgent = async (req, res, next) => {
  try {
    const travelAgentId = req.user.id;

    // Hitung total paket yang dibuat oleh travel agent ini
    const totalPackages = await db.Package.count({
      where: { created_by: travelAgentId },
    });

    // Hitung total pesanan untuk paket milik travel agent
    const totalOrders = await db.Order.count({
      include: [
        {
          model: db.Package,
          as: "package",
          where: { created_by: travelAgentId },
        },
      ],
    });

    // Hitung total pendapatan dari paket milik travel agent - FIXED
    const totalRevenueResult = await db.Order.findOne({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("Order.total_price")), "total"],
      ],
      include: [
        {
          model: db.Package,
          as: "package",
          where: { created_by: travelAgentId },
          attributes: [], // Kosongkan attributes agar tidak ditambahkan ke SELECT
        },
      ],
      where: { order_status: "paid" },
      raw: true,
    });

    const totalRevenue = totalRevenueResult?.total || 0;

    // Hitung paket yang aktif (status 'published') milik travel agent
    const activePackages = await db.Package.count({
      where: {
        created_by: travelAgentId,
        status: "published",
      },
    });

    // Hitung rincian status pesanan untuk paket milik travel agent
    const orderStatus = {
      paid: await db.Order.count({
        include: [
          {
            model: db.Package,
            as: "package",
            where: { created_by: travelAgentId },
          },
        ],
        where: { order_status: "paid" },
      }),
      pending: await db.Order.count({
        include: [
          {
            model: db.Package,
            as: "package",
            where: { created_by: travelAgentId },
          },
        ],
        where: { order_status: "pending" },
      }),
      cancelled: await db.Order.count({
        include: [
          {
            model: db.Package,
            as: "package",
            where: { created_by: travelAgentId },
          },
        ],
        where: { order_status: "cancelled" },
      }),
    };

    // Data pendapatan agregat per tahun untuk paket milik travel agent
    const yearlyRevenue = await db.Order.findAll({
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("Order.createdAt"), "%Y"),
          "year",
        ],
        [sequelize.fn("SUM", sequelize.col("Order.total_price")), "total"],
      ],
      include: [
        {
          model: db.Package,
          as: "package",
          where: { created_by: travelAgentId },
          attributes: [],
        },
      ],
      where: { order_status: "paid" },
      group: ["year"],
      order: [["year", "DESC"]],
      raw: true,
    });

    // Ambil parameter tahun dari query (default: tahun berjalan)
    const selectedYear = req.query.year || new Date().getFullYear();

    // Data pendapatan per bulan untuk tahun yang dipilih
    const monthlyRevenue = await db.Order.findAll({
      attributes: [
        [
          sequelize.fn(
            "DATE_FORMAT",
            sequelize.col("Order.createdAt"),
            "%Y-%m"
          ),
          "month",
        ],
        [sequelize.fn("SUM", sequelize.col("Order.total_price")), "total"],
      ],
      include: [
        {
          model: db.Package,
          as: "package",
          where: { created_by: travelAgentId },
          attributes: [],
        },
      ],
      where: {
        order_status: "paid",
        createdAt: {
          [Op.gte]: new Date(`${selectedYear}-01-01`),
          [Op.lt]: new Date(`${parseInt(selectedYear) + 1}-01-01`),
        },
      },
      group: ["month"],
      order: [["month", "ASC"]],
      raw: true,
    });

    // Format data bulanan untuk memastikan semua bulan ada (termasuk yang 0)
    const allMonths = Array.from({ length: 12 }, (_, i) => {
      const month = (i + 1).toString().padStart(2, "0");
      return `${selectedYear}-${month}`;
    });

    const formattedMonthlyRevenue = allMonths.map((month) => {
      const found = monthlyRevenue.find((item) => item.month === month);
      return {
        month,
        total: found ? parseFloat(found.total) : 0,
      };
    });

    // Ambil 5 pesanan terbaru untuk paket milik travel agent
    const recentOrders = await db.Order.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.Package,
          as: "package",
          where: { created_by: travelAgentId },
          attributes: ["name"],
        },
        { model: db.User, as: "user", attributes: ["name"] },
      ],
    });

    const conversionRate =
      totalOrders > 0 ? Math.round((orderStatus.paid / totalOrders) * 100) : 0;

    // Hitung pesanan bulan ini
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const ordersThisMonth = await db.Order.count({
      include: [
        {
          model: db.Package,
          as: "package",
          where: { created_by: travelAgentId },
        },
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(currentYear, currentMonth - 1, 1),
          [Op.lt]: new Date(currentYear, currentMonth, 1),
        },
      },
    });

    // Hitung pendapatan bulan ini - FIXED
    const revenueThisMonthResult = await db.Order.findOne({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("Order.total_price")), "total"],
      ],
      include: [
        {
          model: db.Package,
          as: "package",
          where: { created_by: travelAgentId },
          attributes: [], // Kosongkan attributes
        },
      ],
      where: {
        order_status: "paid",
        createdAt: {
          [Op.gte]: new Date(currentYear, currentMonth - 1, 1),
          [Op.lt]: new Date(currentYear, currentMonth, 1),
        },
      },
      raw: true,
    });

    const revenueThisMonth = revenueThisMonthResult?.total || 0;

    // Ambil 5 paket terpopuler berdasarkan jumlah pesanan - FIXED
    const popularPackages = await db.Package.findAll({
      attributes: [
        "id",
        "name",
        "price_double",
        [sequelize.fn("COUNT", sequelize.col("orders.id")), "order_count"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              `CASE WHEN \`orders\`.\`order_status\` = 'paid' THEN \`orders\`.\`total_price\` ELSE 0 END`
            )
          ),
          "total_revenue",
        ],
      ],
      include: [
        {
          model: db.Order,
          as: "orders",
          attributes: [], // Kosong karena kita tidak butuh kolom dari orders
          required: false, // LEFT JOIN untuk menyertakan paket tanpa pesanan
        },
      ],
      where: {
        created_by: travelAgentId,
      },
      group: ["Package.id", "Package.name", "Package.price_double"], // Tambahkan semua kolom non-aggregate ke GROUP BY
      order: [[sequelize.literal("order_count"), "DESC"]],
      limit: 5,
      subQuery: false, // Diperlukan agar `limit` bekerja dengan benar pada query agregasi
    });

    // Kirim semua data dashboard travel agent sebagai respons
    res.json({
      success: true,
      data: {
        totalPackages,
        totalOrders,
        totalRevenue: parseFloat(totalRevenue), // Konversi ke number
        activePackages,
        conversionRate,
        ordersThisMonth,
        revenueThisMonth: parseFloat(revenueThisMonth), // Konversi ke number
        orderStatus,
        yearlyRevenue,
        monthlyRevenue: formattedMonthlyRevenue,
        selectedYear: parseInt(selectedYear),
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          package_name: order.package?.name,
          user_name: order.user?.name,
          total_price: order.total_price,
          order_status: order.order_status,
          createdAt: order.createdAt,
        })),
        popularPackages: popularPackages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          price: pkg.price_double,
          order_count: parseInt(pkg.get("order_count") || 0, 10),
          total_revenue: parseFloat(pkg.get("total_revenue") || 0),
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat data dashboard",
      error: error.message,
    });
  }
};

module.exports = {
  dashboardAdmin,
  dashboardTravelAgent,
};
