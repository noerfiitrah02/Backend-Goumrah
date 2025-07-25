module.exports = (sequelize, DataTypes) => {
  const PackageImage = sequelize.define(
    "PackageImage",
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

  PackageImage.associate = (models) => {
    PackageImage.belongsTo(models.Package, {
      foreignKey: "package_id",
      as: "package",
    });
  };

  return PackageImage;
};
