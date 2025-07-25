module.exports = (sequelize, DataTypes) => {
  const PackageHotel = sequelize.define(
    "PackageHotel",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      package_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      check_in_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      check_out_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      indexes: [
        {
          unique: true,
          fields: ["package_id", "hotel_id", "check_in_date"],
        },
      ],
    }
  );

  PackageHotel.associate = (models) => {
    PackageHotel.belongsTo(models.Package, {
      foreignKey: "package_id",
      as: "package",
    });

    PackageHotel.belongsTo(models.Hotel, {
      foreignKey: "hotel_id",
      as: "hotel",
    });
  };

  return PackageHotel;
};
