module.exports = (sequelize, DataTypes) => {
  const PackageCategory = sequelize.define(
    "PackageCategory",
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
        unique: true,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  PackageCategory.associate = (models) => {
    PackageCategory.hasMany(models.Package, {
      foreignKey: "category_id",
      as: "packages",
    });
  };

  return PackageCategory;
};
