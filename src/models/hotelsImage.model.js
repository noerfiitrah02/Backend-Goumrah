module.exports = (sequelize, DataTypes) => {
  const HotelImage = sequelize.define(
    "HotelImage",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      image_path: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      caption: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  HotelImage.associate = (models) => {
    HotelImage.belongsTo(models.Hotel, {
      foreignKey: "hotel_id",
      as: "hotel",
    });
  };

  return HotelImage;
};
