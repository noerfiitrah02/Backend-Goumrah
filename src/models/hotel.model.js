module.exports = (sequelize, DataTypes) => {
  const Hotel = sequelize.define(
    "Hotel",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      stars: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      facility: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      distance_to_haram: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      distance_to_nabawi: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      map_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  Hotel.associate = (models) => {
    Hotel.hasMany(models.HotelImage, {
      foreignKey: "hotel_id",
      as: "images",
    });

    Hotel.hasMany(models.PackageHotel, {
      foreignKey: "hotel_id",
      as: "packageHotels",
    });
  };

  return Hotel;
};
