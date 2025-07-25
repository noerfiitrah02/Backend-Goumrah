module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      package_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      room_type: {
        type: DataTypes.ENUM("double", "triple", "quadruple"),
        allowNull: false,
      },
      order_status: {
        type: DataTypes.ENUM("pending", "paid", "cancelled", "failed"),
        defaultValue: "pending",
      },
      total_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  Order.associate = (models) => {
    Order.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });

    Order.belongsTo(models.Package, {
      foreignKey: "package_id",
      as: "package",
    });

    Order.hasMany(models.OrderDetail, {
      foreignKey: "order_id",
      as: "details",
    });
  };

  return Order;
};
